import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Time-based one-time codes (RFC 6238 on RFC 4226): 6 digits, a 30-second step, HMAC-SHA1, which is
 * what Google Authenticator, 1Password and Authy all default to. Server only.
 */

export const DIGITS = 6;
export const STEP = 30;
/** Steps either side of now that still count, for a phone clock a little off. */
const DRIFT = 1;

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/** Spaces, dashes, padding and case are ignored, as authenticator apps show secrets in groups. */
export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = B32.indexOf(char);
    if (index < 0) throw new Error("The TOTP secret is not valid base32.");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new secret: 160 random bits, the size RFC 4226 recommends for SHA-1. */
export const newSecret = () => base32Encode(randomBytes(20));

export const stepAt = (ms = Date.now()) => Math.floor(ms / 1000 / STEP);

export function codeAt(secret: Buffer, step: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", secret).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  const binary = mac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** The step the code belongs to, if it is valid now (within the drift), or null. */
export function matchStep(secret: Buffer, code: string, now = Date.now()): number | null {
  if (!new RegExp(`^\\d{${DIGITS}}$`).test(code)) return null;
  const current = stepAt(now);
  let found: number | null = null;
  // Check every step in the window, so the time taken doesn't say which one matched.
  for (let step = current - DRIFT; step <= current + DRIFT; step++) {
    if (timingSafeEqual(Buffer.from(codeAt(secret, step)), Buffer.from(code)) && found === null) found = step;
  }
  return found;
}

/** The `otpauth://` URI an authenticator app reads from the QR code. */
export function otpauthUri(secret: string, account: string, issuer: string) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(DIGITS), period: String(STEP) });
  return `otpauth://totp/${label}?${params}`;
}
