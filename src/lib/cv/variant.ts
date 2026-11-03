import type { z } from "zod";
import type { variantSchema } from "./schema";
import {
  SECTION_TITLES,
  cvEntries,
  cvHeader,
  cvSkills,
  cvSummaries,
  getCvEntry,
  MAX_BULLETS,
  type CvBullet,
  type CvEntry,
  type CvSectionId,
  type CvSkillGroup,
} from "@/content/cv";

/** One tailored version of the CV and the site; see `variantSchema` in ./schema for the fields. */
export type Variant = z.infer<typeof variantSchema>;

/** What a visitor's browser gets: the variant only, never the private label. */
export type PublicVariant = { code: string; variant: Variant };

/** Skills come first, so a reader sees at once what the CV is built on. */
export const DEFAULT_SECTIONS: CvSectionId[] = ["skills", "experience", "projects", "education", "awards"];

/** Without a variant: the heavier entries, and their strongest lines up to a cap per section. */
const DEFAULT_BULLET_CAP: Record<CvEntry["section"], number> = { experience: 4, projects: 2, education: 2, awards: 1 };

function defaultBullets(entry: CvEntry): CvBullet[] {
  const strong = entry.bullets.filter((b) => b.weight >= 2);
  return strong.slice(0, entry.bulletCap ?? DEFAULT_BULLET_CAP[entry.section]);
}

/**
 * Check a variant against the master CV. Returns every problem found, so an agent can fix them in one
 * pass; an empty list means it is valid.
 */
export function checkVariant(v: Variant, projectSlugs: string[]): string[] {
  const errors: string[] = [];
  if (v.summaryId && !cvSummaries.some((s) => s.id === v.summaryId)) errors.push(`Unknown summaryId "${v.summaryId}".`);
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
  for (const id of v.skills ?? []) if (!cvSkills.some((g) => g.id === id)) errors.push(`Unknown skill group "${id}".`);
  for (const [id, items] of Object.entries(v.skillItems ?? {})) {
    const group = cvSkills.find((g) => g.id === id);
    if (!group) errors.push(`skillItems: unknown skill group "${id}".`);
    else for (const t of items) if (!group.items.includes(t)) errors.push(`skillItems.${id}: "${t}" is not in ${group.label}.`);
  }
  for (const slug of v.projects ?? []) if (!projectSlugs.includes(slug)) errors.push(`Unknown project "${slug}".`);
  return errors;
}

export type ResolvedEntry = Omit<CvEntry, "bullets" | "titles"> & { title: string; bullets: CvBullet[] };
export type ResolvedSection = { id: CvSectionId; title: string; entries: ResolvedEntry[] };
export type ResolvedCv = {
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
 * the site link carries it, so a reader who clicks it lands on the site tailored for them.
 */
export function resolveCv(v: Variant = {}, code?: string): ResolvedCv {
  const chosen = v.entries
    ? v.entries.map(getCvEntry).filter((e): e is CvEntry => Boolean(e))
    : cvEntries.filter((e) => e.weight >= 2);
  const resolve = (e: CvEntry): ResolvedEntry => {
    const { titles, bullets: all, ...rest } = e;
    const ids = v.bullets?.[e.id];
    const bullets = ids
      ? ids.map((id) => all.find((b) => b.id === id)).filter((b): b is CvBullet => Boolean(b))
      : defaultBullets(e);
    const wanted = v.titles?.[e.id];
    const stack = v.stacks?.[e.id]?.filter((t) => e.stack?.includes(t)) ?? e.stack;
    return { ...rest, title: wanted && titles.includes(wanted) ? wanted : titles[0], bullets, stack };
  };
  // Skills is a section with no entries: the renderer reads `skills` at that spot.
  const sections: ResolvedSection[] = [];
  for (const id of v.sections ?? DEFAULT_SECTIONS) {
    const entries = id === "skills" ? [] : chosen.filter((e) => e.section === id).map(resolve);
    if (id === "skills" || entries.length) sections.push({ id, title: SECTION_TITLES[id], entries });
  }
  const skills = (
    v.skills ? v.skills.map((id) => cvSkills.find((g) => g.id === id)).filter((g): g is CvSkillGroup => Boolean(g)) : cvSkills
  ).map((g) => {
    const items = v.skillItems?.[g.id]?.filter((t) => g.items.includes(t));
    return items ? { ...g, items } : g;
  });
  const summary = v.summary ?? cvSummaries.find((s) => s.id === v.summaryId)?.text ?? cvSummaries[0].text;
  const contact = v.contact ?? true;
  const site = code ? { ...cvHeader.site, href: `${cvHeader.site.href}/?v=${code}` } : cvHeader.site;
  return {
    name: cvHeader.name,
    headline: v.headline ?? cvHeader.headlines[0],
    location: cvHeader.location,
    contact,
    email: contact ? cvHeader.email : undefined,
    links: contact ? [site, ...cvHeader.links] : [site],
    summary,
    sections,
    skills,
  };
}

/**
 * The whole master CV, for proofreading: every entry and every line, with the alternative headlines,
 * summaries and titles side by side. It runs long; it is not a CV to send.
 */
export function masterCv(): ResolvedCv {
  const cv = resolveCv({ entries: cvEntries.map((e) => e.id) });
  const sections = cv.sections.map((s) => ({
    ...s,
    entries: s.entries.map((e) => {
      const full = getCvEntry(e.id)!;
      return { ...e, title: full.titles.join(" / "), bullets: full.bullets };
    }),
  }));
  return { ...cv, headline: cvHeader.headlines.join(" / "), summary: cvSummaries.map((s) => s.text).join("\n\n"), sections };
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
      if (e.stack?.length) lines.push(`Tech: ${e.stack.join(", ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
