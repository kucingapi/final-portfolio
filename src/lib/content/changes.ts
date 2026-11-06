import type { Operation } from "rfc6902";

/** One change between the published copy and the draft, worded for the dashboard. */
export type Change = { kind: "added" | "removed" | "changed" | "moved"; path: string; where: string; before?: string; after?: string };

const ITEM_KEYS = ["title", "name", "label", "heading", "role", "org", "slug", "id"];

/** The value at a JSON Pointer, or undefined. */
export function at(root: unknown, pointer: string): unknown {
  let node = root;
  for (const raw of pointer.split("/").slice(1)) {
    const k = raw.replaceAll("~1", "/").replaceAll("~0", "~");
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[k];
  }
  return node;
}

const words = (key: string) => {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

/** "/projects/0/chapters/2/title" → "Projects › AgentFlow › Chapters › Day one › Title". */
export function describePath(root: unknown, pointer: string): string {
  const parts = pointer.split("/").slice(1);
  const out: string[] = [];
  let node = root;
  for (const raw of parts) {
    const k = raw.replaceAll("~1", "/").replaceAll("~0", "~");
    const next = node && typeof node === "object" ? (node as Record<string, unknown>)[k] : undefined;
    if (Array.isArray(node) && /^\d+$/.test(k)) {
      const item = next && typeof next === "object" ? (next as Record<string, unknown>) : null;
      const name = item && ITEM_KEYS.map((key) => item[key]).find((v) => typeof v === "string" && v.trim());
      out.push(typeof name === "string" ? name : `#${Number(k) + 1}`);
    } else if (k !== "-") out.push(/\s/.test(k) ? k : words(k)); // a key with spaces is text (the Bahasa dictionary's)
    node = next;
  }
  return out.join(" › ") || "Everything";
}

export function summarize(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value.length > 160 ? `${value.slice(0, 157)}…` : value;
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (value && typeof value === "object") {
    const name = ITEM_KEYS.map((k) => (value as Record<string, unknown>)[k]).find((v) => typeof v === "string");
    return typeof name === "string" ? name : `${Object.keys(value).length} fields`;
  }
  return String(value);
}

/** Word JSON Patch operations (from `createPatch(published, draft)`) for people. */
export function describeChanges(ops: Operation[], before: unknown, after: unknown): Change[] {
  return ops
    .filter((op) => op.op !== "test")
    .map((op): Change => {
      const where = describePath(op.op === "remove" ? before : after, op.path);
      if (op.op === "add") return { kind: "added", path: op.path, where, after: summarize(op.value) };
      if (op.op === "remove") return { kind: "removed", path: op.path, where, before: summarize(at(before, op.path)) };
      if (op.op === "replace") return { kind: "changed", path: op.path, where, before: summarize(at(before, op.path)), after: summarize(op.value) };
      return { kind: "moved", path: op.path, where, before: describePath(before, op.from) };
    });
}
