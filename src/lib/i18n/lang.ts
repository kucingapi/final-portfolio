/**
 * The site's languages. English lives at the root (/projects), Bahasa Indonesia under /id (/id/projects).
 * Inside the app every page sits under app/[lang]; next.config.ts rewrites the unprefixed English
 * addresses to /en/… so both languages share one set of pages. Safe for the browser.
 */

export const LANGS = ["en", "id"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";

export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);

/** Each language in its own words, for the switch. */
export const LANG_NAMES: Record<Lang, string> = { en: "English", id: "Bahasa Indonesia" };
/** BCP 47 tags for <html lang>, hreflang and Intl. */
export const LOCALES: Record<Lang, string> = { en: "en", id: "id" };

/** Addresses that are not pages: they never take a language prefix. */
const NOT_PAGES = /^\/(?:api|go|dashboard|_next|relay)(?:[/?#]|$)/;
const PREFIX = /^\/(en|id)(?=[/?#]|$)/;

/** A path without its language prefix, and the language the prefix named (English when there is none). */
export function splitLang(path: string): { lang: Lang; path: string } {
  const m = PREFIX.exec(path);
  if (!m) return { lang: DEFAULT_LANG, path };
  const rest = path.slice(m[0].length);
  return { lang: m[1] as Lang, path: rest.startsWith("/") ? rest : `/${rest}` };
}

/**
 * The same page in a language: `/projects` → `/id/projects`, `/?v=x` → `/id?v=x`, and back. Only site
 * paths change; external links, API routes and files pass through as they are.
 */
export function localePath(lang: Lang, href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const { path } = splitLang(href);
  if (lang === DEFAULT_LANG || NOT_PAGES.test(path)) return path;
  if (path === "/") return `/${lang}`;
  return /^\/[?#]/.test(path) ? `/${lang}${path.slice(1)}` : `/${lang}${path}`;
}
