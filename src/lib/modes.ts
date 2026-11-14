/**
 * The ways to read the site. Client-safe on purpose (no zod): the mode script in <head>, the navbar
 * and the content schema all build from this one list.
 */
export const MODES = ["freelance", "fulltime", "speaker"] as const;
export type Mode = (typeof MODES)[number];
export const DEFAULT_MODE: Mode = "freelance";
export const isMode = (v: unknown): v is Mode => typeof v === "string" && (MODES as readonly string[]).includes(v);
/** Other words a `?mode=` link may use. */
export const MODE_ALIASES: Record<string, Mode> = { teacher: "speaker", teaching: "speaker", speaking: "speaker" };
