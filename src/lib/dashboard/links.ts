import { localFile, redis } from "@/lib/kv";
import { newCode } from "@/lib/cv/store";
import { site } from "@/content/site";

/**
 * Short links: `/go/<name>` redirects to a destination and counts the click. Stored beside the CV
 * variants (Upstash Redis, or `.data/` in development). Server only.
 */

export type ShortLink = {
  name: string;
  /** An absolute http(s) URL, or a path on this site such as "/projects/agentflow". */
  url: string;
  /** Private: what the link is for. */
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type Device = "mobile" | "tablet" | "desktop";
export type Click = { at: string; country?: string; referrer?: string; device: Device };
export type LinkStats = { total: number; lastClick?: string; /** Clicks per day, Jakarta time, "2026-11-03" → 4. */ days: Record<string, number> };

/** How many recent clicks each link keeps in its log. */
export const LOG_SIZE = 200;

const KEY = (name: string) => `go:link:${name}`;
const STATS = (name: string) => `go:stats:${name}`;
const LOG = (name: string) => `go:log:${name}`;
const INDEX = "go:links";
const links = () => localFile<ShortLink>("go-links.json");
const clicks = () => localFile<{ stats: LinkStats; log: Click[] }>("go-clicks.json");

const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const isName = (name: string) => name.length <= 64 && NAME.test(name);

/** Throws a readable error when the destination can't be redirected to. */
export function checkDestination(url: string) {
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("The destination must be a full URL (https://…) or a path on this site (/…).");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("The destination must be an http(s) URL.");
  return parsed.toString();
}

export const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: site.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

export async function getLink(name: string): Promise<ShortLink | null> {
  if (!isName(name)) return null;
  if (redis) return (await redis.get<ShortLink>(KEY(name))) ?? null;
  return (await links().read())[name] ?? null;
}

export async function listLinks(): Promise<ShortLink[]> {
  if (redis) {
    const names = await redis.zrange<string[]>(INDEX, 0, -1, { rev: true });
    const rows = names.length ? await redis.mget<(ShortLink | null)[]>(...names.map(KEY)) : [];
    return rows.filter((r): r is ShortLink => Boolean(r));
  }
  return Object.values(await links().read()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function put(row: ShortLink) {
  if (redis) {
    await redis.set(KEY(row.name), row);
    await redis.zadd(INDEX, { score: Date.parse(row.createdAt), member: row.name });
    return;
  }
  const store = links();
  const all = await store.read();
  all[row.name] = row;
  await store.write(all);
}

/** A new link. A blank name gets a random 8-character code. */
export async function createLink(input: { name?: string; url: string; note?: string }): Promise<ShortLink> {
  const url = checkDestination(input.url.trim());
  let name = input.name?.trim().toLowerCase() ?? "";
  if (name && !isName(name)) throw new Error("Names use lowercase letters, digits and single dashes (up to 64).");
  if (name && (await getLink(name))) throw new Error(`/go/${name} already exists.`);
  while (!name) {
    const candidate = newCode();
    if (!(await getLink(candidate))) name = candidate;
  }
  const now = new Date().toISOString();
  const row: ShortLink = { name, url, note: input.note?.trim() ?? "", createdAt: now, updatedAt: now };
  await put(row);
  return row;
}

/** Change where a link goes, or its note. The name stays, so links already sent keep working. */
export async function updateLink(name: string, input: { url?: string; note?: string }): Promise<ShortLink> {
  const existing = await getLink(name);
  if (!existing) throw new Error(`No link /go/${name}.`);
  const row: ShortLink = {
    ...existing,
    url: input.url === undefined ? existing.url : checkDestination(input.url.trim()),
    note: input.note === undefined ? existing.note : input.note.trim(),
    updatedAt: new Date().toISOString(),
  };
  await put(row);
  return row;
}

export async function deleteLink(name: string): Promise<boolean> {
  if (redis) {
    const removed = await redis.del(KEY(name), STATS(name), LOG(name));
    await redis.zrem(INDEX, name);
    return removed > 0;
  }
  const store = links();
  const all = await store.read();
  if (!all[name]) return false;
  delete all[name];
  await store.write(all);
  const log = clicks();
  const rest = await log.read();
  delete rest[name];
  await log.write(rest);
  return true;
}

// --- Clicks ---------------------------------------------------------------------------------------

export async function recordClick(name: string, click: Click) {
  const day = dayKey(new Date(click.at));
  if (redis) {
    const p = redis.pipeline();
    p.hincrby(STATS(name), "total", 1);
    p.hincrby(STATS(name), `d:${day}`, 1);
    p.hset(STATS(name), { lastClick: click.at });
    p.lpush(LOG(name), JSON.stringify(click));
    p.ltrim(LOG(name), 0, LOG_SIZE - 1);
    await p.exec();
    return;
  }
  const store = clicks();
  const all = await store.read();
  const row = (all[name] ??= { stats: { total: 0, days: {} }, log: [] });
  row.stats.total += 1;
  row.stats.days[day] = (row.stats.days[day] ?? 0) + 1;
  row.stats.lastClick = click.at;
  row.log = [click, ...row.log].slice(0, LOG_SIZE);
  await store.write(all);
}

function toStats(hash: Record<string, unknown> | null): LinkStats {
  const days: Record<string, number> = {};
  for (const [field, value] of Object.entries(hash ?? {})) {
    if (field.startsWith("d:")) days[field.slice(2)] = Number(value);
  }
  return { total: Number(hash?.total ?? 0), lastClick: hash?.lastClick ? String(hash.lastClick) : undefined, days };
}

/** Totals for many links in one round trip. */
export async function getStats(names: string[]): Promise<Record<string, LinkStats>> {
  if (!names.length) return {};
  if (redis) {
    const p = redis.pipeline();
    names.forEach((name) => p.hgetall(STATS(name)));
    const rows = await p.exec<(Record<string, unknown> | null)[]>();
    return Object.fromEntries(names.map((name, i) => [name, toStats(rows[i])]));
  }
  const all = await clicks().read();
  return Object.fromEntries(names.map((name) => [name, all[name]?.stats ?? { total: 0, days: {} }]));
}

export async function getClicks(name: string): Promise<Click[]> {
  if (redis) {
    const rows = await redis.lrange<Click | string>(LOG(name), 0, LOG_SIZE - 1);
    // Upstash parses JSON values on the way out; older or odd rows may still be strings.
    return rows.map((row) => (typeof row === "string" ? (JSON.parse(row) as Click) : row));
  }
  return (await clicks().read())[name]?.log ?? [];
}
