import { Redis } from "@upstash/redis";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Variant } from "./variant";

/**
 * Where variants live: Upstash Redis in production (the env names the Vercel Upstash integration sets,
 * or Upstash's own), and a JSON file under `.data/` in development so the whole flow works locally
 * without an account. Server only.
 */

export type StoredVariant = {
  code: string;
  /** Private: who this version is for (company, role). Never sent to a visitor. */
  label: string;
  variant: Variant;
  createdAt: string;
  updatedAt: string;
};

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const KEY = (code: string) => `cv:variant:${code}`;
const INDEX = "cv:variants";
const FILE = path.join(process.cwd(), ".data", "cv-variants.json");

function local() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("CV variants need Upstash Redis: set KV_REST_API_URL and KV_REST_API_TOKEN.");
  }
  return {
    async read(): Promise<Record<string, StoredVariant>> {
      try {
        return JSON.parse(await readFile(FILE, "utf8"));
      } catch {
        return {};
      }
    },
    async write(all: Record<string, StoredVariant>) {
      await mkdir(path.dirname(FILE), { recursive: true });
      await writeFile(FILE, JSON.stringify(all, null, 2));
    },
  };
}

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

/** Create (no code) or replace (existing code) a variant. Returns what was stored. */
export async function saveVariant(input: { code?: string; label: string; variant: Variant }): Promise<StoredVariant> {
  const now = new Date().toISOString();
  const existing = input.code ? await getVariant(input.code) : null;
  if (input.code && !existing) throw new Error(`No variant with code "${input.code}".`);
  let code = input.code;
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
