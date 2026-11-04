import { cacheLife, cacheTag } from "next/cache";
import { draftMode } from "next/headers";
import type { CvContent, DocContent, DocId, Project, SiteContent } from "./schema";
import { draftValue, publishedValue } from "./store";

/**
 * How pages, PDFs and the MCP read the content. Each read is cached with its document's tag and the
 * longest lifetime, so pages stay in the prerendered static shell until a publish expires the tag (see
 * src/app/dashboard/content-actions.ts). In Draft Mode, started from the dashboard's Preview, the
 * same reads return the draft instead.
 */

export const CONTENT_TAGS: Record<DocId, string> = { site: "content:site", cv: "content:cv", projects: "content:projects" };

async function read<D extends DocId>(doc: D): Promise<DocContent[D]> {
  return (await draftMode()).isEnabled ? draftValue(doc) : publishedValue(doc);
}

export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheTag(CONTENT_TAGS.site);
  cacheLife("max");
  return read("site");
}

export async function getCvContent(): Promise<CvContent> {
  "use cache";
  cacheTag(CONTENT_TAGS.cv);
  cacheLife("max");
  return read("cv");
}

/** Every project, in the order the site lists them. */
export async function getProjects(): Promise<Project[]> {
  "use cache";
  cacheTag(CONTENT_TAGS.projects);
  cacheLife("max");
  return (await read("projects")).projects;
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await getProjects()).find((p) => p.slug === slug);
}
