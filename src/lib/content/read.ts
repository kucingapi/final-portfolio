import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";
import type { Lang } from "@/lib/i18n/lang";
import { translateDoc, type Dict } from "@/lib/i18n/translate";
import type { CvContent, DocContent, DocId, Project, SiteView } from "./schema";
import { siteView } from "./backfill";
import { draftValue, publishedValue } from "./store";

/**
 * How pages, PDFs and the MCP read the content. Each read is cached with its document's tag and the
 * longest lifetime, so pages stay in the prerendered static shell until a publish expires the tag (see
 * src/app/dashboard/content-actions.ts). In Draft Mode, started from the dashboard's Preview, the
 * same reads return the draft instead.
 *
 * Every read takes a language. English is the document as written; another language is the same document
 * with its words swapped for the translation's (the `bahasa` document), so it carries that tag too.
 */

export const CONTENT_TAGS: Record<DocId, string> = {
  site: "content:site",
  cv: "content:cv",
  projects: "content:projects",
  bahasa: "content:bahasa",
};

async function read<D extends DocId>(doc: D): Promise<DocContent[D]> {
  return (await draftMode()).isEnabled ? draftValue(doc) : publishedValue(doc);
}

/** English text → the language's words. Empty for English. */
export async function getTranslations(lang: Lang): Promise<Dict> {
  "use cache";
  // Before returning, even for English: a cached read with no lifetime of its own would give the page
  // the default one (15 minutes) and expire the static shell long before a publish does.
  cacheLife("max");
  if (lang === "en") return {};
  cacheTag(CONTENT_TAGS.bahasa);
  return (await read("bahasa")).strings;
}

async function inLang<T>(value: T, lang: Lang): Promise<T> {
  return lang === "en" ? value : translateDoc(value, await getTranslations(lang), lang);
}

export async function getSiteContent(lang: Lang = "en"): Promise<SiteView> {
  "use cache";
  cacheTag(CONTENT_TAGS.site);
  if (lang !== "en") cacheTag(CONTENT_TAGS.bahasa);
  cacheLife("max");
  const site = await read("site");
  // A site document published before the rate card, the speaking list or Speaker mode existed lacks them.
  return inLang(siteView(site), lang);
}

export async function getCvContent(lang: Lang = "en"): Promise<CvContent> {
  "use cache";
  cacheTag(CONTENT_TAGS.cv);
  if (lang !== "en") cacheTag(CONTENT_TAGS.bahasa);
  cacheLife("max");
  return inLang(await read("cv"), lang);
}

/** Every project, in the order the site lists them. */
export async function getProjects(lang: Lang = "en"): Promise<Project[]> {
  "use cache";
  cacheTag(CONTENT_TAGS.projects);
  if (lang !== "en") cacheTag(CONTENT_TAGS.bahasa);
  cacheLife("max");
  return inLang((await read("projects")).projects, lang);
}

export async function getProject(slug: string, lang: Lang = "en"): Promise<Project | undefined> {
  return (await getProjects(lang)).find((p) => p.slug === slug);
}
