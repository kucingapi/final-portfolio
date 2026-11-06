import type { Metadata } from "next";
import { DEFAULT_LANG, LANGS, LOCALES, isLang, localePath, type Lang } from "./lang";

/** The live site, for absolute links in metadata. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://www.novelbafagih.com";

/** The `lang` route parameter as a language; the router only ever passes en or id. */
export const langParam = (value: string): Lang => (isLang(value) ? value : DEFAULT_LANG);

/** A page's address in each language, so search engines pair the two versions. `path` is the English one. */
export function alternates(lang: Lang, path: string): Metadata["alternates"] {
  return {
    canonical: localePath(lang, path),
    languages: { ...Object.fromEntries(LANGS.map((l) => [LOCALES[l], localePath(l, path)])), "x-default": path },
  };
}
