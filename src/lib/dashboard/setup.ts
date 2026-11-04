import { createHash, randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { site } from "@/content/site";
import { adoptSecret, secretInEnv, totpSecret } from "./auth";
import { countUp, deleteValue, getValue, setValue } from "./state";
import { newSecret, otpauthUri } from "./totp";

/**
 * Setting up sign-in on the live site. Anyone can ask for a setup link, but it only ever goes to the
 * contact form's inbox, so only Novel can open it. A link works once and lasts 15 minutes. The same
 * link replaces the secret after a lost phone, which signs every device out. Server only.
 *
 * Mail scanners open links to check them, so opening the page reveals nothing: the secret is made and
 * shown only when the page asks for it with a POST, after a tap.
 */

const TTL = 15 * 60;
/** Setup links per hour, for everyone: enough to retry, too few to flood the inbox. */
const MAX_LINKS = 5;

type SetupRow = { expiresAt: number; reset: boolean; pending?: string };
const key = (token: string) => `dash:setup:${createHash("sha256").update(token).digest("hex")}`;

export class SetupError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

// The address in the code, not the editable copy: an edit to the site's email must never redirect sign-in links.
const inbox = () => process.env.CONTACT_TO_EMAIL || site.email;

/** "no•••••••••••09@gmail.com": enough to recognise, not enough to harvest. */
export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  const shown = user.length > 4 ? `${user.slice(0, 2)}${"•".repeat(user.length - 4)}${user.slice(-2)}` : `${user[0]}•••`;
  return `${shown}@${domain}`;
}

export const setupInbox = () => maskEmail(inbox());

/**
 * Where the emailed link points. Never the request's own host: a forged Host or X-Forwarded-Host
 * could aim the link at someone else's site and hand them the token. Vercel's own variables say
 * where this deployment lives; only local development falls back to the request.
 */
function linkOrigin(requestUrl: string) {
  const env = process.env;
  if (env.VERCEL_ENV === "production") {
    return env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (env.VERCEL_ENV) return `https://${env.VERCEL_BRANCH_URL || env.VERCEL_URL}`;
  return new URL(requestUrl).origin;
}

export async function sendSetupLink(requestUrl: string) {
  if (secretInEnv()) throw new SetupError("Sign-in is fixed by DASHBOARD_TOTP_SECRET on the server. Remove it to set up here.", 409);
  if ((await countUp("dash:setup:sent", 3600)) > MAX_LINKS) {
    throw new SetupError("Too many setup links in the last hour. Try again later.", 429);
  }
  const token = randomBytes(32).toString("base64url");
  const reset = Boolean(await totpSecret());
  await setValue(key(token), { expiresAt: Date.now() + TTL * 1000, reset } satisfies SetupRow, { ex: TTL });
  await email(reset, `${linkOrigin(requestUrl)}/dashboard/setup?token=${token}`);
  return { sentTo: setupInbox() };
}

async function email(reset: boolean, link: string) {
  const what = reset ? "reset" : "set up";
  const text = [
    `Open this link to ${what} sign-in for your portfolio dashboard:`,
    "",
    link,
    "",
    `It works once and expires in 15 minutes.${reset ? " Finishing it replaces your authenticator code and signs out every device." : ""}`,
    "If you didn't ask for it, ignore this email: nothing changes until the link is used.",
  ].join("\n");

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[dashboard] RESEND_API_KEY not set, so here is the setup link instead of an email:\n${link}`);
      return;
    }
    throw new SetupError("Email isn't set up on this site yet (RESEND_API_KEY), so no link can be sent.", 503);
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL ?? "Portfolio <onboarding@resend.dev>",
      to: [inbox()],
      subject: reset ? "Reset your dashboard sign-in" : "Set up your dashboard sign-in",
      text,
    }),
  });
  if (!res.ok) {
    console.error("[dashboard] Resend error", res.status, await res.text().catch(() => ""));
    throw new SetupError("The email couldn't be sent. Try again in a minute.", 502);
  }
}

async function readRow(token: string): Promise<SetupRow | null> {
  if (!/^[\w-]{43}$/.test(token)) return null;
  const row = await getValue<SetupRow>(key(token));
  return row && row.expiresAt > Date.now() ? row : null;
}

/** Whether a link still works, and whether it sets up or resets. Reveals nothing else. */
export async function setupLink(token: string) {
  const row = await readRow(token);
  return row ? { reset: row.reset } : null;
}

const expired = () => new SetupError("This link has expired or was already used. Ask for a new one.", 410);

/** The new secret, as a QR code, an `otpauth://` link and the key to type. The same one on every call. */
export async function revealSetup(token: string) {
  const row = await readRow(token);
  if (!row) throw expired();
  if (!row.pending) {
    row.pending = newSecret();
    await setValue(key(token), row, { ex: Math.max(1, Math.ceil((row.expiresAt - Date.now()) / 1000)) });
  }
  const uri = otpauthUri(row.pending, site.email, `${site.name} dashboard`);
  const qr = await QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#010326", light: "#ffffff" } });
  return { key: row.pending.match(/.{1,4}/g)!.join(" "), uri, qr };
}

/** The first code from the app: when it matches, the secret takes over and the link is used up. */
export async function finishSetup(token: string, code: string) {
  const row = await readRow(token);
  if (!row?.pending) throw expired();
  if (secretInEnv()) throw new SetupError("Sign-in is fixed by DASHBOARD_TOTP_SECRET on the server. Remove it to set up here.", 409);
  const result = await adoptSecret(row.pending, code);
  if (result.ok) await deleteValue(key(token));
  return result;
}
