import { Redis } from "@upstash/redis";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * The site's one store: Upstash Redis in production (the env names the Vercel Upstash integration sets,
 * or Upstash's own), and JSON files under `.data/` in development so everything works locally without
 * an account. Server only.
 */

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
export const redis = url && token ? new Redis({ url, token }) : null;

/** A JSON file under `.data/`, standing in for Redis in development. Throws in production. */
export function localFile<T>(name: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("This needs Upstash Redis: set KV_REST_API_URL and KV_REST_API_TOKEN.");
  }
  const file = path.join(process.cwd(), ".data", name);
  return {
    async read(): Promise<Record<string, T>> {
      try {
        return JSON.parse(await readFile(file, "utf8"));
      } catch {
        return {};
      }
    },
    async write(all: Record<string, T>) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, JSON.stringify(all, null, 2));
    },
  };
}

/**
 * One more on a count that clears `seconds` after its first step: `{ count, ttl }` (the seconds left).
 * One atomic script rather than separate calls, which could see the key expire between them and leave
 * an INCR'd count with no expiry: a limit that would then refuse for good, and that a burst of requests
 * timed at the end of a window could cause on purpose. It also mends a count already left without one.
 */
const COUNT_WITHIN = `local n = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  ttl = tonumber(ARGV[1])
  redis.call('EXPIRE', KEYS[1], ttl)
end
return {n, ttl}`;

export async function countWithin(r: Redis, key: string, seconds: number) {
  const [count, ttl] = await r.eval<[number], [number, number]>(COUNT_WITHIN, [key], [seconds]);
  return { count: Number(count), ttl: Number(ttl) };
}
