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
