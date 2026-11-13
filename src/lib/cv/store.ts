import { localFile, redis } from "@/lib/kv";
import type { Variant } from "./variant";

/**
 * Where variants live: Upstash Redis in production, and `.data/cv-variants.json` in development so the
 * whole flow works locally without an account (see src/lib/kv.ts). Server only.
 */

export type StoredVariant = {
  code: string;
  /** Private: who this version is for (company, role). Never sent to a visitor. */
  label: string;
  variant: Variant;
  createdAt: string;
  updatedAt: string;
};

const KEY = (code: string) => `cv:variant:${code}`;
const ACTIVITY_KEY = (code: string) => `cv:activity:${code}`;
const INDEX = "cv:variants";

function local<T = StoredVariant>(file = "cv-variants.json") {
  return localFile<T>(file);
}
const ACTIVITY_FILE = "cv-activity.json";

/** Codes look like noise on purpose: 8 characters with no look-alikes (no 0/o, 1/l/i). */
const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export function newCode(length = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
export const isCode = (code: string) => new RegExp(`^[${ALPHABET}]{6,16}$`).test(code);

export async function getVariant(code: string): Promise<StoredVariant | null> {
  if (!isCode(code)) return null;
  if (redis) return (await redis.get<StoredVariant>(KEY(code))) ?? null;
  return (await local().read())[code] ?? null;
}

export async function listVariants(): Promise<StoredVariant[]> {
  let all: StoredVariant[];
  if (redis) {
    const codes = await redis.zrange<string[]>(INDEX, 0, -1, { rev: true });
    const rows = codes.length ? await redis.mget<(StoredVariant | null)[]>(...codes.map(KEY)) : [];
    all = rows.filter((r): r is StoredVariant => Boolean(r));
  } else {
    all = Object.values(await local().read());
  }
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Create (no code) or replace (existing `code`) a variant, or create one under a chosen unused code (`claim`),
 * for a link that went out before its variant was saved. Returns what was stored.
 */
export async function saveVariant(input: { code?: string; claim?: string; label: string; variant: Variant }): Promise<StoredVariant> {
  const now = new Date().toISOString();
  const { claim } = input;
  if (claim !== undefined) {
    if (input.code) throw new Error("Pass code to replace a variant or claim to create one, not both.");
    if (!isCode(claim)) throw new Error(`Cannot claim "${claim}": a code is 6 to 16 characters from "${ALPHABET}".`);
    if (await getVariant(claim)) throw new Error(`Cannot claim "${claim}": it is taken. Pass it as code to replace that variant.`);
  }
  const existing = input.code ? await getVariant(input.code) : null;
  if (input.code && !existing) throw new Error(`No variant with code "${input.code}".`);
  let code = input.code || claim;
  while (!code) {
    const candidate = newCode();
    if (!(await getVariant(candidate))) code = candidate;
  }
  const row: StoredVariant = {
    code,
    label: input.label,
    variant: input.variant,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (redis) {
    await redis.set(KEY(code), row);
    await redis.zadd(INDEX, { score: Date.parse(now), member: code });
  } else {
    const store = local();
    const all = await store.read();
    all[code] = row;
    await store.write(all);
  }
  return row;
}

export async function deleteVariant(code: string): Promise<boolean> {
  if (redis) {
    const removed = await redis.del(KEY(code));
    await redis.del(ACTIVITY_KEY(code));
    await redis.zrem(INDEX, code);
    return removed > 0;
  }
  const store = local();
  const all = await store.read();
  if (!all[code]) return false;
  delete all[code];
  await store.write(all);
  return true;
}

/**
 * What happened to one tailored link: how often it was opened (once per browser per five minutes, as
 * the variant response is cached that long) and how often its CV, portfolio and rate card PDFs were fetched and its rate card page viewed.
 */
export type LinkActivity = { opens: number; cv: number; portfolio: number; rates: number; rateViews: number; firstOpen?: string; lastOpen?: string };
export type ActivityKind = "opens" | "cv" | "portfolio" | "rates" | "rateViews";

/** Novel's own browser, marked by visiting any page with `?test=1` (see src/lib/analytics.ts). */
export const fromTester = (request: Request) => /(?:^|;\s*)nb_test=1(?:;|$)/.test(request.headers.get("cookie") ?? "");

export async function recordActivity(code: string, kind: ActivityKind) {
  const now = new Date().toISOString();
  if (redis) {
    const key = ACTIVITY_KEY(code);
    await redis.hincrby(key, kind, 1);
    if (kind === "opens") {
      await redis.hsetnx(key, "firstOpen", now);
      await redis.hset(key, { lastOpen: now });
    }
    return;
  }
  const store = local<LinkActivity>(ACTIVITY_FILE);
  const all = await store.read();
  const row = (all[code] ??= { opens: 0, cv: 0, portfolio: 0, rates: 0, rateViews: 0 });
  row[kind] = (row[kind] ?? 0) + 1;
  if (kind === "opens") {
    row.firstOpen ??= now;
    row.lastOpen = now;
  }
  await store.write(all);
}

export async function getActivity(code: string): Promise<LinkActivity> {
  const row = redis
    ? await redis.hgetall<Record<string, string | number>>(ACTIVITY_KEY(code))
    : (await local<LinkActivity>(ACTIVITY_FILE).read())[code];
  return {
    opens: Number(row?.opens ?? 0),
    cv: Number(row?.cv ?? 0),
    portfolio: Number(row?.portfolio ?? 0),
    rates: Number(row?.rates ?? 0),
    rateViews: Number(row?.rateViews ?? 0),
    firstOpen: row?.firstOpen ? String(row.firstOpen) : undefined,
    lastOpen: row?.lastOpen ? String(row.lastOpen) : undefined,
  };
}
