import type { z } from "zod";
import type { variantSchema } from "./schema";
import { DEFAULT_LANG, localePath, type Lang } from "@/lib/i18n/lang";
import { translateText, type Dict } from "@/lib/i18n/translate";
import { UI } from "@/lib/i18n/ui";
import {
  MAX_BULLETS,
  type CvBullet,
  type CvContent,
  type CvEntry,
  type CvSectionId,
  type CvSkillGroup,
  type Project,
} from "@/lib/content/schema";

/** One tailored version of the CV and the site; see `variantSchema` in ./schema for the fields. */
export type Variant = z.infer<typeof variantSchema>;

/** What a visitor's browser gets: the variant only, never the private label. */
export type PublicVariant = { code: string; variant: Variant };

/** Skills come first, so a reader sees at once what the CV is built on. */
export const DEFAULT_SECTIONS: CvSectionId[] = ["skills", "experience", "projects", "education", "awards"];

/** Without a variant: the heavier entries, and their strongest lines up to a cap per section. */
const DEFAULT_BULLET_CAP: Record<CvEntry["section"], number> = { experience: 4, projects: 2, education: 2, awards: 1 };

function defaultBullets(entry: CvEntry, lang: Lang): CvBullet[] {
  const strong = entry.bullets.filter((b) => b.weight >= 2);
  const cap = entry.bulletCap ?? DEFAULT_BULLET_CAP[entry.section];
  // Bahasa runs about a tenth longer than English: to stay at two pages, its default CV keeps one line
  // fewer in the lead role (the entry with a cap of its own) and in each education entry.
  const trim = lang !== DEFAULT_LANG && (entry.bulletCap !== undefined || entry.section === "education") ? 1 : 0;
  return strong.slice(0, Math.max(1, cap - trim));
}

/**
 * Check a variant against the master CV. Returns every problem found, so an agent can fix them in one
 * pass; an empty list means it is valid.
 */
export function checkVariant(cv: CvContent, v: Variant, projects: Pick<Project, "slug" | "chapters">[]): string[] {
  const projectSlugs = projects.map((p) => p.slug);
  const getCvEntry = (id: string) => cv.entries.find((e) => e.id === id);
  const errors: string[] = [];
  if (v.summaryId && !cv.summaries.some((s) => s.id === v.summaryId)) errors.push(`Unknown summaryId "${v.summaryId}".`);
  for (const id of v.entries ?? []) if (!getCvEntry(id)) errors.push(`Unknown entry "${id}".`);
  for (const [id, bulletIds] of Object.entries(v.bullets ?? {})) {
    const entry = getCvEntry(id);
    if (!entry) {
      errors.push(`bullets: unknown entry "${id}".`);
      continue;
    }
    for (const b of bulletIds) if (!entry.bullets.some((x) => x.id === b)) errors.push(`bullets.${id}: unknown bullet "${b}".`);
    if (bulletIds.length > MAX_BULLETS) errors.push(`bullets.${id}: ${bulletIds.length} bullets; keep it to 4, or 5 for a lead role.`);
  }
  for (const [id, items] of Object.entries(v.stacks ?? {})) {
    const entry = getCvEntry(id);
    if (!entry) errors.push(`stacks: unknown entry "${id}".`);
    else for (const t of items) if (!entry.stack?.includes(t)) errors.push(`stacks.${id}: "${t}" is not in its stack (${entry.stack?.join(", ") ?? "none"}).`);
  }
  for (const [id, title] of Object.entries(v.titles ?? {})) {
    const entry = getCvEntry(id);
    if (!entry) errors.push(`titles: unknown entry "${id}".`);
    else if (!entry.titles.includes(title)) errors.push(`titles.${id}: "${title}" is not one of ${entry.titles.join(", ")}.`);
  }
  for (const id of v.skills ?? []) if (!cv.skills.some((g) => g.id === id)) errors.push(`Unknown skill group "${id}".`);
  for (const [id, items] of Object.entries(v.skillItems ?? {})) {
    const group = cv.skills.find((g) => g.id === id);
    if (!group) errors.push(`skillItems: unknown skill group "${id}".`);
    else for (const t of items) if (!group.items.includes(t)) errors.push(`skillItems.${id}: "${t}" is not in ${group.label}.`);
  }
  for (const slug of v.projects ?? []) if (!projectSlugs.includes(slug)) errors.push(`Unknown project "${slug}".`);
  const chaptersOf = (slug: string, field: string) => {
    const p = projects.find((x) => x.slug === slug);
    if (!p) errors.push(`${field}: unknown project "${slug}".`);
    return p?.chapters ?? [];
  };
  for (const [slug, id] of Object.entries(v.stats ?? {})) {
    const chapters = chaptersOf(slug, "stats");
    const c = chapters.find((x) => x.id === id);
    if (chapters.length && !c) errors.push(`stats.${slug}: no chapter "${id}" (${chapters.map((x) => x.id).join(", ")}).`);
    else if (c && !c.figure) errors.push(`stats.${slug}: chapter "${id}" has no figure; pick one that has.`);
  }
  for (const [slug, ids] of Object.entries(v.chapters ?? {})) {
    const chapters = chaptersOf(slug, "chapters");
    for (const id of ids)
      if (chapters.length && !chapters.some((x) => x.id === id))
        errors.push(`chapters.${slug}: no chapter "${id}" (${chapters.map((x) => x.id).join(", ")}).`);
  }
  // A repeated id would print its line again on every PDF fetch of the saved link, so refuse it.
  const lists: [string, string[] | undefined][] = [
    ["sections", v.sections],
    ["entries", v.entries],
    ["skills", v.skills],
    ["projects", v.projects],
    ...Object.entries(v.bullets ?? {}).map(([id, l]): [string, string[]] => [`bullets.${id}`, l]),
    ...Object.entries(v.stacks ?? {}).map(([id, l]): [string, string[]] => [`stacks.${id}`, l]),
    ...Object.entries(v.skillItems ?? {}).map(([id, l]): [string, string[]] => [`skillItems.${id}`, l]),
    ...Object.entries(v.chapters ?? {}).map(([slug, l]): [string, string[]] => [`chapters.${slug}`, l]),
  ];
  for (const [name, list] of lists) {
    const seen = new Set<string>();
    for (const item of list ?? []) {
      if (seen.has(item)) errors.push(`${name}: "${item}" is listed twice.`);
      seen.add(item);
    }
  }
  return errors;
}

export type ResolvedEntry = Omit<CvEntry, "bullets" | "titles"> & { title: string; bullets: CvBullet[] };
export type ResolvedSection = { id: CvSectionId; title: string; entries: ResolvedEntry[] };
export type ResolvedCv = {
  /** The language it is written in; the PDFs take their labels from it. */
  lang: Lang;
  name: string;
  headline: string;
  location: string;
  /** False when the variant hides contact details: no email, and the site is the only link. */
  contact: boolean;
  email?: string;
  links: { label: string; href: string }[];
  summary?: string;
  sections: ResolvedSection[];
  skills: CvSkillGroup[];
};

/**
 * Turn a variant into the CV it describes. Unknown ids are skipped, not fatal. With the variant's `code`,
 * the site link carries it, so a reader who clicks it lands on the site tailored for them. For another
 * language, `cv` is the master CV in that language and `v` has been through localizeVariant.
 */
export function resolveCv(cv: CvContent, v: Variant = {}, code?: string, lang: Lang = DEFAULT_LANG): ResolvedCv {
  const chosen = v.entries
    ? v.entries.map((id) => cv.entries.find((e) => e.id === id)).filter((e): e is CvEntry => Boolean(e))
    : cv.entries.filter((e) => e.weight >= 2);
  const resolve = (e: CvEntry): ResolvedEntry => {
    const { titles, bullets: all, ...rest } = e;
    const ids = v.bullets?.[e.id];
    const bullets = ids
      ? ids.map((id) => all.find((b) => b.id === id)).filter((b): b is CvBullet => Boolean(b))
      : defaultBullets(e, lang);
    const wanted = v.titles?.[e.id];
    const stack = v.stacks?.[e.id]?.filter((t) => e.stack?.includes(t)) ?? e.stack;
    return { ...rest, title: wanted && titles.includes(wanted) ? wanted : titles[0], bullets, stack };
  };
  // Skills is a section with no entries: the renderer reads `skills` at that spot.
  const sections: ResolvedSection[] = [];
  for (const id of v.sections ?? DEFAULT_SECTIONS) {
    const entries = id === "skills" ? [] : chosen.filter((e) => e.section === id).map(resolve);
    if (id === "skills" || entries.length) sections.push({ id, title: UI[lang].cv.sections[id], entries });
  }
  const skills = (
    v.skills ? v.skills.map((id) => cv.skills.find((g) => g.id === id)).filter((g): g is CvSkillGroup => Boolean(g)) : cv.skills
  ).map((g) => {
    const items = v.skillItems?.[g.id]?.filter((t) => g.items.includes(t));
    return items ? { ...g, items } : g;
  });
  const summary = v.summary ?? cv.summaries.find((s) => s.id === v.summaryId)?.text ?? cv.summaries[0].text;
  const contact = v.contact ?? true;
  const { header } = cv;
  const home = lang === DEFAULT_LANG ? header.site.href : `${header.site.href}${localePath(lang, "/")}`;
  // A CV in the other language than its link's keeps the reader in that language (see VariantLoader).
  const pin = lang === (v.lang ?? DEFAULT_LANG) ? "" : `&lang=${lang}`;
  const site = code ? { ...header.site, href: `${lang === DEFAULT_LANG ? `${home}/` : home}?v=${code}${pin}` } : { ...header.site, href: home };
  return {
    lang,
    name: header.name,
    headline: v.headline ?? header.headlines[0],
    location: header.location,
    contact,
    email: contact ? header.email : undefined,
    links: contact ? [site, ...header.links] : [site],
    summary,
    sections,
    skills,
  };
}

/**
 * The whole master CV, for proofreading: every entry and every line, with the alternative headlines,
 * summaries and titles side by side. It runs long; it is not a CV to send.
 */
export function masterCv(content: CvContent, lang: Lang = DEFAULT_LANG): ResolvedCv {
  const cv = resolveCv(content, { entries: content.entries.map((e) => e.id) }, undefined, lang);
  const sections = cv.sections.map((s) => ({
    ...s,
    entries: s.entries.map((e) => {
      const full = content.entries.find((x) => x.id === e.id)!;
      return { ...e, title: full.titles.join(" / "), bullets: full.bullets };
    }),
  }));
  return {
    ...cv,
    headline: content.header.headlines.join(" / "),
    summary: content.summaries.map((s) => s.text).join("\n\n"),
    sections,
  };
}

/** Plain-text rendering, for agents to read what a variant produces. */
export function cvToText(cv: ResolvedCv): string {
  const lines = [cv.name, cv.headline, [cv.location, cv.email, ...cv.links.map((l) => l.label)].filter(Boolean).join(" | "), ""];
  if (cv.summary) lines.push(cv.summary, "");
  for (const s of cv.sections) {
    lines.push(s.title.toUpperCase());
    if (s.id === "skills") {
      for (const g of cv.skills) lines.push(`${g.label}: ${g.items.join(", ")}`);
    }
    for (const e of s.entries) {
      lines.push(`${e.org}${e.place ? ` – ${e.place}` : ""} [${e.id}]`);
      lines.push(`${e.title}${e.note ? ` (${e.note})` : ""}    ${e.period}`);
      if (e.about) lines.push(e.about);
      for (const b of e.bullets) lines.push(`• ${b.text} [${b.id}]`);
      if (e.stack?.length) lines.push(`${UI[cv.lang].cv.tech} ${e.stack.join(", ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/* ── Languages ────────────────────────────────────────────────────────── */

/**
 * The CV's own names a variant picks by their English words: entry titles, skill items and headlines,
 * each with its translation. Small enough to send to the browser, which tailors the CV and the career
 * lists itself.
 */
export function variantNames(cv: CvContent, dict: Dict, lang: Lang): Dict {
  if (lang === DEFAULT_LANG) return {};
  const words = [...cv.header.headlines, ...cv.entries.flatMap((e) => e.titles), ...cv.skills.flatMap((g) => g.items)];
  const out: Dict = {};
  for (const w of words) {
    const t = translateText(w, dict, lang);
    if (t !== w) out[w] = t;
  }
  return out;
}

/**
 * A variant as it reads in `lang`. It names titles, skill items and stock headlines in English (as the
 * master CV has them); `names` gives their translations. Its own summary is written in the variant's
 * language, so in another one the stock summary it chose (or the first) stands in. A headline of its own
 * is usually a job title and stays.
 */
export function localizeVariant(v: Variant | undefined, lang: Lang, names: Dict): Variant | undefined {
  if (!v) return v;
  const same = (v.lang ?? DEFAULT_LANG) === lang;
  if (lang === DEFAULT_LANG && same) return v;
  const t = (s: string) => names[s] ?? s;
  const map = (r: Record<string, string> | undefined) => r && Object.fromEntries(Object.entries(r).map(([k, x]) => [k, t(x)]));
  const mapAll = (r: Record<string, string[]> | undefined) => r && Object.fromEntries(Object.entries(r).map(([k, x]) => [k, x.map(t)]));
  return {
    ...v,
    headline: v.headline && t(v.headline),
    summary: same ? v.summary : undefined,
    titles: map(v.titles),
    skillItems: mapAll(v.skillItems),
  };
}

/**
 * A variant whose titles, skill items or headline are given in another language, named in English the
 * way the master CV is, so it can be checked and read in any language. `names` is variantNames.
 */
export function normalizeVariant(v: Variant, names: Dict): Variant {
  const back = Object.fromEntries(Object.entries(names).map(([en, x]) => [x, en]));
  if (!Object.keys(back).length) return v;
  const t = (s: string) => back[s] ?? s;
  const map = (r: Record<string, string> | undefined) => r && Object.fromEntries(Object.entries(r).map(([k, x]) => [k, t(x)]));
  const mapAll = (r: Record<string, string[]> | undefined) => r && Object.fromEntries(Object.entries(r).map(([k, x]) => [k, x.map(t)]));
  return { ...v, headline: v.headline && t(v.headline), titles: map(v.titles), skillItems: mapAll(v.skillItems) };
}
