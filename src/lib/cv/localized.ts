import { getCvContent, getTranslations } from "@/lib/content/read";
import { DEFAULT_LANG, isLang, type Lang } from "@/lib/i18n/lang";
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
