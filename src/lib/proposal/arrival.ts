import { localePath, splitLang, type Lang } from "@/lib/i18n/lang";

/**
 * Where a fresh tailored-link open moves to, or null to stay (see VariantLoader). A link in the other
 * language opens the same page in its language, unless the address pinned the language; a link with a
 * proposal opened on the home page opens on its proposal instead. Client-safe.
 */
export function arrivalMove(o: { path: string; lang: Lang; wanted: Lang; pinned: boolean; proposal: boolean }): string | null {
  const page = splitLang(o.path).path;
  const toProposal = o.proposal && page === "/";
  const lang = o.pinned ? o.lang : o.wanted;
  if (!toProposal && lang === o.lang) return null;
  return localePath(lang, toProposal ? "/proposal" : page);
}
