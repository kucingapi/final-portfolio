import type { Lang } from "./lang";

/**
 * How the content (site, cv, projects) reads in another language. English is the source of truth for
 * everything but the words: ids, order, images, numbers and links always come from the English document.
 * A translation is a dictionary keyed by the English text itself, so it survives reordering, and a line
 * whose English changes falls back to English until it is translated again, rather than showing a stale
 * translation. Pure functions, safe in the browser.
 */

export type Dict = Record<string, string>;

/**
 * Keys whose values are never translated: ids and slugs (tailored links point at them), paths and image
 * files, enums the code reads (their words come from the UI dictionary), tool names, and people's own
 * words (a testimonial is quoted as it was said).
 */
const LOCKED = new Set([
  "id",
  "slug",
  "href",
  "src",
  "real",
  "abstract",
  "avatar",
  "proof",
  "link",
  "email",
  "social",
  "section",
  "platform",
  "context",
  "mode",
  "tags",
  "cv",
  "stack",
  "name",
  "quote",
]);

type Path = (string | number)[];

/**
 * `from` names a chapter in a project's parts but is a value in a chapter's figure; a career role's
 * `kind` is one of CAREER_KINDS, a project's is words.
 */
function locked(path: Path): boolean {
  const keys = path.filter((p): p is string => typeof p === "string");
  const key = keys[keys.length - 1];
  if (key === undefined) return false;
  if (key === "from") return keys.includes("parts");
  if (key === "kind") return keys.includes("career") || keys.includes("careerDetail");
  return keys.some((k) => LOCKED.has(k));
}

/* ── Dates ────────────────────────────────────────────────────────────── */

const MONTHS: Partial<Record<Lang, Record<string, string>>> = {
  id: {
    Jan: "Jan",
    Feb: "Feb",
    Mar: "Mar",
    Apr: "Apr",
    May: "Mei",
    Jun: "Jun",
    Jul: "Jul",
    Aug: "Agu",
    Sep: "Sep",
    Sept: "Sep",
    Oct: "Okt",
    Nov: "Nov",
    Dec: "Des",
    January: "Januari",
    February: "Februari",
    March: "Maret",
    April: "April",
    June: "Juni",
    July: "Juli",
    August: "Agustus",
    September: "September",
    October: "Oktober",
    November: "November",
    December: "Desember",
    Present: "Sekarang",
    Now: "Sekarang",
  },
};
const ENGLISH_MONTHS = new Set(Object.keys(MONTHS.id!));

/** "Mar 2023 – Jun 2024", "16 Aug 2024", "2020 – 2024": dates and nothing else. */
export function isDateLike(s: string): boolean {
  const words = s.split(/[\s–—\-,/.]+/).filter(Boolean);
  return words.length > 0 && words.every((w) => /^\d+$/.test(w) || ENGLISH_MONTHS.has(w)) && /\d/.test(s);
}

/** A date range in another language's month names, or null when the string is more than dates. */
export function localizeDate(s: string, lang: Lang): string | null {
  const months = MONTHS[lang];
  if (!months || !isDateLike(s)) return null;
  return s.replace(/[A-Za-z]+/g, (w) => months[w] ?? w);
}

/* ── Translating ──────────────────────────────────────────────────────── */

/** One string in the target language: its translation, its dates in local month names, or itself. */
export function translateText(s: string, dict: Dict, lang: Lang): string {
  return dict[s] ?? dict[s.trim()] ?? localizeDate(s, lang) ?? s;
}

/** A content document (or any part of one) in another language. English comes back unchanged. */
export function translateDoc<T>(value: T, dict: Dict, lang: Lang): T {
  if (lang === "en") return value;
  const walk = (v: unknown, path: Path): unknown => {
    if (typeof v === "string") return locked(path) ? v : translateText(v, dict, lang);
    if (Array.isArray(v)) return v.map((item, i) => walk(item, [...path, i]));
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, [...path, k])]));
    return v;
  };
  return walk(value, []) as T;
}

/* ── What needs translating ───────────────────────────────────────────── */

/** A string a translation should cover, with where it first appears (a JSON Pointer). */
export type Source = { path: string; text: string };

const pointer = (path: Path) => path.map((p) => "/" + String(p).replaceAll("~", "~0").replaceAll("/", "~1")).join("");

/** Text that reads the same in any language: numbers and symbols, web addresses, paths. */
function universal(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (/^[\d\s.,:%+×x→–—\-/<>~#$()]+$/.test(t)) return true;
  if (/^(https?:\/\/|\/|mailto:)/.test(t)) return true;
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t);
}

/**
 * Every string in a document a translation should cover, in document order, each once. Leaves out locked
 * fields, dates (their month names translate on their own) and text that reads the same in any language.
 */
export function sourceStrings(value: unknown): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  const walk = (v: unknown, path: Path) => {
    if (typeof v === "string") {
      if (locked(path) || universal(v) || isDateLike(v) || seen.has(v)) return;
      seen.add(v);
      out.push({ path: pointer(path), text: v });
    } else if (Array.isArray(v)) v.forEach((item, i) => walk(item, [...path, i]));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, [...path, k]);
  };
  walk(value, []);
  return out;
}
