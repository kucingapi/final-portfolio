import { localFile, redis } from "@/lib/kv";

/**
 * The dashboard's own small records: the sign-in secret, setup links, notification devices and the
 * activity feed. Upstash Redis in production, `.data/dashboard.json` in development (see src/lib/kv.ts).
 * Server only.
 */

type Row = { v: unknown; exp?: number };
const file = () => localFile<Row>("dashboard.json");
const live = (row: Row | undefined) => (row && (!row.exp || row.exp > Date.now()) ? row : undefined);
const expiry = (ex?: number) => (ex ? { exp: Date.now() + ex * 1000 } : {});

/**
 * Development: one file holds every record, and a click, an open and a download can all write to it at
 * once, so writes take turns or the last one would undo the others. On globalThis, as each route gets
 * its own copy of this module.
 */
const turns = globalThis as { __nbDashTurn?: Promise<unknown> };
function inTurn<T>(fn: () => Promise<T>): Promise<T> {
  const run = (turns.__nbDashTurn ?? Promise.resolve()).then(fn, fn);
  turns.__nbDashTurn = run.catch(() => {});
  return run;
}

export async function getValue<T>(key: string): Promise<T | null> {
  if (redis) return (await redis.get<T>(key)) ?? null;
  return (live((await file().read())[key])?.v as T | undefined) ?? null;
}

/** Store a value, for `ex` seconds when given. With `nx` only if the key is free: false when it wasn't. */
export async function setValue(key: string, value: unknown, opts: { ex?: number; nx?: boolean } = {}): Promise<boolean> {
  if (redis) {
    const { ex, nx } = opts;
    const result = ex ? await redis.set(key, value, nx ? { ex, nx: true } : { ex }) : await redis.set(key, value, nx ? { nx: true } : undefined);
    return result === "OK";
  }
  return inTurn(async () => {
    const store = file();
    const all = await store.read();
    if (opts.nx && live(all[key])) return false;
    all[key] = { v: value, ...expiry(opts.ex) };
    await store.write(all);
    return true;
  });
}

export async function deleteValue(key: string) {
  if (redis) {
    await redis.del(key);
    return;
  }
  await inTurn(async () => {
    const store = file();
    const all = await store.read();
    delete all[key];
    await store.write(all);
  });
}

/** Count up; the count clears `window` seconds after its first step. Returns the new count. */
export async function countUp(key: string, window: number): Promise<number> {
  if (redis) {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, window);
    return count;
  }
  return inTurn(async () => {
    const store = file();
    const all = await store.read();
    const row = live(all[key]);
    const count = (Number(row?.v) || 0) + 1;
    all[key] = { v: count, exp: row?.exp ?? Date.now() + window * 1000 };
    await store.write(all);
    return count;
  });
}

/** Add to the front of a list that keeps its newest `max` items. */
export async function pushToList(key: string, item: unknown, max: number) {
  if (redis) {
    const p = redis.pipeline();
    p.lpush(key, JSON.stringify(item));
    p.ltrim(key, 0, max - 1);
    await p.exec();
    return;
  }
  await inTurn(async () => {
    const store = file();
    const all = await store.read();
    const list = (live(all[key])?.v as unknown[] | undefined) ?? [];
    all[key] = { v: [item, ...list].slice(0, max) };
    await store.write(all);
  });
}

/** Take one item, as `readList` returned it, out of a list. */
export async function removeFromList(key: string, item: unknown) {
  const stored = JSON.stringify(item);
  if (redis) {
    await redis.lrem(key, 1, stored);
    return;
  }
  await inTurn(async () => {
    const store = file();
    const all = await store.read();
    const list = (live(all[key])?.v as unknown[] | undefined) ?? [];
    const at = list.findIndex((x) => JSON.stringify(x) === stored);
    if (at >= 0) all[key] = { v: list.filter((_, i) => i !== at) };
    await store.write(all);
  });
}

export async function readList<T>(key: string, count: number): Promise<T[]> {
  if (redis) {
    const rows = await redis.lrange<T | string>(key, 0, count - 1);
    // Upstash parses JSON values on the way out; an odd row may still be a string.
    return rows.map((row) => (typeof row === "string" ? (JSON.parse(row) as T) : row));
  }
  return ((live((await file().read())[key])?.v as T[] | undefined) ?? []).slice(0, count);
}
