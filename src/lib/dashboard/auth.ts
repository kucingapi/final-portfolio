import { createHmac, timingSafeEqual } from "node:crypto";
import { countWithin, redis } from "@/lib/kv";
import { getValue, setValue } from "./state";
import { base32Decode, matchStep } from "./totp";

/**
 * Sign-in for the dashboard: an authenticator code, no users or passwords. The TOTP secret is made by
 * the setup page and kept in the store (or fixed by the `DASHBOARD_TOTP_SECRET` env var, which wins);
 * the session cookie is signed with a key derived from it, so a new secret signs every device out.
 * Server only.
 */

export const SESSION_COOKIE = "nb_dash";
export const SESSION_DAYS = 7;
const MAX_FAILS = 5;
const LOCK_SECONDS = 15 * 60;
const SECRET_KEY = "dash:totp:secret";

const envSecret = () => process.env.DASHBOARD_TOTP_SECRET?.trim() || null;

/** True when the env var fixes the secret, so the setup page can't replace it. */
export const secretInEnv = () => Boolean(envSecret());

export async function totpSecret(): Promise<Buffer | null> {
  const raw = envSecret() ?? (await getValue<string>(SECRET_KEY));
  if (!raw) return null;
  const secret = base32Decode(raw);
  if (secret.length < 10) throw new Error("The dashboard's TOTP secret is too short: use at least 16 base32 characters.");
  return secret;
}

// --- Session ------------------------------------------------------------------------------------

const sessionKey = (secret: Buffer) => createHmac("sha256", secret).update("novel-dashboard-session-v1").digest();
const sign = (secret: Buffer, payload: string) =>
  createHmac("sha256", sessionKey(secret)).update(payload).digest("base64url");

export function newSessionToken(secret: Buffer, now = Date.now()) {
  const payload = `v1.${now + SESSION_DAYS * 86_400_000}`;
  return `${payload}.${sign(secret, payload)}`;
}

export async function validSession(token: string | undefined, now = Date.now()) {
  if (!token) return false;
  const secret = await totpSecret();
  if (!secret) return false;
  const match = /^(v1\.(\d+))\.([\w-]+)$/.exec(token);
  if (!match || Number(match[2]) < now) return false;
  const expected = Buffer.from(sign(secret, match[1]));
  const given = Buffer.from(match[3]);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const readCookie = (request: Request, name: string) =>
  request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

/**
 * A browser saying the request came from a page that isn't this origin: another site, or a sibling
 * subdomain ("same-site"), which a SameSite=Strict cookie would still go along with. Refusing it is the
 * second lock on the door, and it also covers the routes that need no session (sign-in, setup links).
 * The dashboard's own fetches say "same-origin"; requests without the header (curl, older browsers) are
 * left to the cookie.
 */
export const crossSite = (request: Request) => {
  const from = request.headers.get("sec-fetch-site");
  return from === "cross-site" || from === "same-site";
};

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** For route handlers: is this request from a signed-in browser? Changes must also come from this site. */
export const signedIn = async (request: Request) =>
  !(crossSite(request) && !SAFE_METHODS.has(request.method)) && (await validSession(readCookie(request, SESSION_COOKIE)));

/** For the routes that work without a session: a cross-site page may not call them. */
export const forbiddenCrossSite = () =>
  Response.json({ error: "Not from another site." }, { status: 403, headers: { "Cache-Control": "no-store" } });

/** A fresh session token for a browser that is signed in, so a week counts from its last visit. */
export async function renewSession(request: Request) {
  if (!(await signedIn(request))) return null;
  const secret = await totpSecret();
  return secret ? newSessionToken(secret) : null;
}

export const unauthorized = () =>
  Response.json({ error: "Sign in first." }, { status: 401, headers: { "Cache-Control": "no-store" } });

/** Secure everywhere but plain-http localhost, where some browsers would drop a Secure cookie. */
export function sessionCookie(request: Request, value: string, maxAge = SESSION_DAYS * 86_400) {
  const secure = new URL(request.url).protocol === "https:" || process.env.NODE_ENV === "production";
  return [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Strict",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

// --- Rate limit and replay ------------------------------------------------------------------------

/**
 * A 6-digit code alone could be guessed, so attempts are counted: five wrong codes in a row lock
 * sign-in for 15 minutes, for everyone, as there is only one person to let in. A code that worked once
 * is refused if it comes again, and so is any code older than the last one used.
 *
 * The attempt is counted *before* the code is checked, with one atomic increment. Checking a lock and
 * counting the failure afterwards would let a burst of parallel requests all pass the check before the
 * first failure lands, so a single burst could try thousands of codes. With the count taken first, only
 * the first five of any burst ever reach the code check.
 */
type Limits = {
  /** Reserves an attempt: 0 when it may go ahead, else the seconds left on the lock. */
  begin(): Promise<number>;
  /** The reserved attempt was wrong: the count lasts another 15 minutes, so the fifth in a row locks for 15. */
  fail(): Promise<void>;
  /** Claims the step; false if it, or a later one, was already used. */
  claim(step: number): Promise<boolean>;
  reset(): Promise<void>;
  /** A new secret: forget the old one's used steps and claim this first code's. */
  restart(step: number): Promise<void>;
};

const K = { tries: "dash:signin:tries", last: "dash:signin:last", step: (s: number) => `dash:signin:step:${s}` };

const redisLimits = (r: NonNullable<typeof redis>): Limits => ({
  async begin() {
    // Counted and given its expiry in one atomic step, so no count can ever be left to lock sign-in for good.
    const { count, ttl } = await countWithin(r, K.tries, LOCK_SECONDS);
    if (count <= MAX_FAILS) return 0;
    return ttl > 0 ? ttl : LOCK_SECONDS;
  },
  async fail() {
    await r.expire(K.tries, LOCK_SECONDS);
  },
  async claim(step) {
    const last = Number((await r.get<number>(K.last)) ?? 0);
    if (step <= last) return false;
    const fresh = await r.set(K.step(step), 1, { nx: true, ex: 120 });
    if (fresh !== "OK") return false;
    await r.set(K.last, step, { ex: 86_400 });
    return true;
  },
  async reset() {
    await r.del(K.tries);
  },
  async restart(step) {
    await r.set(K.step(step), 1, { ex: 120 });
    await r.set(K.last, step, { ex: 86_400 });
    await r.del(K.tries);
  },
});

/** Development without Redis: the same rules, kept in memory for as long as the dev server runs. */
const memory = ((globalThis as { __nbDashTries?: { tries: number; until: number; last: number } }).__nbDashTries ??= {
  tries: 0,
  until: 0,
  last: 0,
});
const memoryLimits: Limits = {
  async begin() {
    if (memory.until <= Date.now()) {
      memory.tries = 0;
      memory.until = Date.now() + LOCK_SECONDS * 1000;
    }
    if (++memory.tries <= MAX_FAILS) return 0;
    return Math.max(1, Math.ceil((memory.until - Date.now()) / 1000));
  },
  async fail() {
    memory.until = Date.now() + LOCK_SECONDS * 1000;
  },
  async claim(step) {
    if (step <= memory.last) return false;
    memory.last = step;
    return true;
  },
  async reset() {
    memory.tries = 0;
  },
  async restart(step) {
    memory.last = step;
    memory.tries = 0;
  },
};

function limits(): Limits {
  if (redis) return redisLimits(redis);
  if (process.env.NODE_ENV === "production") {
    throw new Error("Dashboard sign-in needs Upstash Redis for its rate limit: set KV_REST_API_URL and KV_REST_API_TOKEN.");
  }
  return memoryLimits;
}

export type SignInResult = { ok: true; token: string } | { ok: false; error: string; status: number };

const lockedOut = (seconds: number): SignInResult => ({
  ok: false,
  error: `Too many wrong codes. Try again in ${Math.ceil(seconds / 60)} min.`,
  status: 429,
});

export async function signIn(code: string): Promise<SignInResult> {
  const secret = await totpSecret();
  if (!secret) return { ok: false, error: "The dashboard has no sign-in set up yet.", status: 503 };
  const store = limits();
  const locked = await store.begin();
  if (locked) return lockedOut(locked);
  const step = matchStep(secret, code.replace(/\s/g, ""));
  if (step === null || !(await store.claim(step))) {
    await store.fail();
    return { ok: false, error: step === null ? "That code is wrong." : "That code was already used. Wait for the next one.", status: 401 };
  }
  await store.reset();
  return { ok: true, token: newSessionToken(secret) };
}

/**
 * Setup: the first code from a new secret proves the app holds it, and only then does the secret
 * replace the old one (signing every device out). Wrong codes count toward the same lock as sign-in.
 */
export async function adoptSecret(base32: string, code: string): Promise<SignInResult> {
  const store = limits();
  const locked = await store.begin();
  if (locked) return lockedOut(locked);
  const secret = base32Decode(base32);
  const step = matchStep(secret, code.replace(/\s/g, ""));
  if (step === null) {
    await store.fail();
    return { ok: false, error: "That code is wrong. Use the new entry in your authenticator app.", status: 401 };
  }
  await setValue(SECRET_KEY, base32);
  await store.restart(step);
  return { ok: true, token: newSessionToken(secret) };
}
