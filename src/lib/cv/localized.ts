import { getCvContent, getSiteContent, getTranslations } from "@/lib/content/read";
import { resolveRateCard } from "./rate-card";
import { DEFAULT_LANG, LANGS, isLang, type Lang } from "@/lib/i18n/lang";
import { renderCvPdf } from "./pdf";
import { localizeVariant, masterCv, resolveCv, variantNames, type ResolvedCv, type Variant } from "./variant";

/**
 * The tailored CV in a language, for the PDFs and the MCP: the master CV in that language, with the
 * variant's English picks put into it. Server only.
 */
export async function cvIn(lang: Lang, v?: Variant, code?: string): Promise<ResolvedCv> {
  const [content, en, dict] = await Promise.all([getCvContent(lang), getCvContent(), getTranslations(lang)]);
  return resolveCv(content, localizeVariant(v, lang, variantNames(en, dict, lang)), code, lang);
}

/** The whole master CV in a language, for proofreading. */
export async function masterCvIn(lang: Lang): Promise<ResolvedCv> {
  return masterCv(await getCvContent(lang), lang);
}

/** The CV's names (titles, skills, headlines) with their translations, for normalizeVariant. */
export async function namesIn(lang: Lang) {
  const [en, dict] = await Promise.all([getCvContent(), getTranslations(lang)]);
  return variantNames(en, dict, lang);
}

/** The language a PDF request asks for: `?lang=`, else the variant's, else English. */
export function requestedLang(param: string | null, v?: Variant): Lang {
  return isLang(param) ? param : (v?.lang ?? DEFAULT_LANG);
}

/** The CV one line shorter: the last line of the entry with the most, as lines come most relevant first. */
function shorter(cv: ResolvedCv): ResolvedCv | null {
  const entries = cv.sections.flatMap((s) => s.entries);
  const longest = entries.reduce<(typeof entries)[number] | null>((a, e) => (e.bullets.length > 1 && (!a || e.bullets.length >= a.bullets.length) ? e : a), null);
  if (!longest) return null;
  return {
    ...cv,
    sections: cv.sections.map((s) => ({ ...s, entries: s.entries.map((e) => (e === longest ? { ...e, bullets: e.bullets.slice(0, -1) } : e)) })),
  };
}

/**
 * The CV as a PDF in a language. A variant is tuned to two pages in its own language; in the other one
 * (Bahasa runs about a tenth longer) it gives up its least relevant lines until it fits again. `cut` is how
 * many lines that took.
 */
export async function cvPdfIn(lang: Lang, v: Variant | undefined, code: string | undefined, origin: string) {
  let cv = await cvIn(lang, v, code);
  let out = await renderCvPdf(cv, origin);
  let cut = 0;
  const tuned = lang === (v?.lang ?? DEFAULT_LANG);
  while (!tuned && out.pages > 2 && cut < 8) {
    const next = shorter(cv);
    if (!next) break;
    cv = next;
    out = await renderCvPdf(cv, origin);
    cut++;
  }
  return { ...out, cv, cut };
}

/** The language a variant isn't written in, whose PDF a visitor gets from the other language's pages. */
export const otherLang = (lang: Lang): Lang => LANGS.find((l) => l !== lang) ?? DEFAULT_LANG;

/** A variant's rate card in a language, or null when it has none. */
export async function rateCardIn(lang: Lang, v: Variant | undefined) {
  if (!v?.rates) return null;
  const { rateCard } = await getSiteContent(lang);
  return rateCard ? resolveRateCard(rateCard, v.rates, lang) : null;
}
