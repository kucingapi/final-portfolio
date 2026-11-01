import type { z } from "zod";
import type { variantSchema } from "./schema";
import {
  SECTION_TITLES,
  cvEntries,
  cvHeader,
  cvSkills,
  cvSummaries,
  getCvEntry,
  type CvBullet,
  type CvEntry,
  type CvSectionId,
  type CvSkillGroup,
} from "@/content/cv";

/** One tailored version of the CV and the site; see `variantSchema` in ./schema for the fields. */
export type Variant = z.infer<typeof variantSchema>;

/** What a visitor's browser gets: the variant only, never the private label. */
export type PublicVariant = { code: string; variant: Variant };

export const DEFAULT_SECTIONS: CvSectionId[] = ["experience", "projects", "leadership", "education", "skills"];

/** Without a variant: the heavier entries, and their strongest lines up to a cap per section. */
const DEFAULT_BULLET_CAP: Record<CvEntry["section"], number> = { experience: 6, projects: 2, leadership: 2, education: 1 };

function defaultBullets(entry: CvEntry): CvBullet[] {
  const strong = entry.bullets.filter((b) => b.weight >= 2);
  return strong.slice(0, DEFAULT_BULLET_CAP[entry.section]);
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
  }
  for (const [id, title] of Object.entries(v.titles ?? {})) {
    const entry = getCvEntry(id);
    if (!entry) errors.push(`titles: unknown entry "${id}".`);
    else if (!entry.titles.includes(title)) errors.push(`titles.${id}: "${title}" is not one of ${entry.titles.join(", ")}.`);
  }
  for (const id of v.skills ?? []) if (!cvSkills.some((g) => g.id === id)) errors.push(`Unknown skill group "${id}".`);
  for (const slug of v.projects ?? []) if (!projectSlugs.includes(slug)) errors.push(`Unknown project "${slug}".`);
  return errors;
}

export type ResolvedEntry = Omit<CvEntry, "bullets" | "titles"> & { title: string; bullets: CvBullet[] };
export type ResolvedSection = { id: CvSectionId; title: string; entries: ResolvedEntry[] };
export type ResolvedCv = {
  name: string;
  headline: string;
  location: string;
  email: string;
  links: { label: string; href: string }[];
  summary?: string;
  sections: ResolvedSection[];
  skills: CvSkillGroup[];
};

/** Turn a variant into the CV it describes. Unknown ids are skipped, not fatal. */
export function resolveCv(v: Variant = {}): ResolvedCv {
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
    return { ...rest, title: wanted && titles.includes(wanted) ? wanted : titles[0], bullets };
  };
  // Skills is a section with no entries: the renderer reads `skills` at that spot.
  const sections: ResolvedSection[] = [];
  for (const id of v.sections ?? DEFAULT_SECTIONS) {
    const entries = id === "skills" ? [] : chosen.filter((e) => e.section === id).map(resolve);
    if (id === "skills" || entries.length) sections.push({ id, title: SECTION_TITLES[id], entries });
  }
  const skills = v.skills
    ? v.skills.map((id) => cvSkills.find((g) => g.id === id)).filter((g): g is CvSkillGroup => Boolean(g))
    : cvSkills;
  const summary = v.summary ?? cvSummaries.find((s) => s.id === v.summaryId)?.text ?? cvSummaries[0].text;
  return {
    name: cvHeader.name,
    headline: v.headline ?? cvHeader.headlines[0],
    location: cvHeader.location,
    email: cvHeader.email,
    links: cvHeader.links,
    summary,
    sections,
    skills,
  };
}

/** Plain-text rendering, for agents to read what a variant produces. */
export function cvToText(cv: ResolvedCv): string {
  const lines = [cv.name, cv.headline, [cv.location, cv.email, ...cv.links.map((l) => l.label)].join(" | "), ""];
  if (cv.summary) lines.push(cv.summary, "");
  for (const s of cv.sections) {
    lines.push(s.title.toUpperCase());
    if (s.id === "skills") {
      for (const g of cv.skills) lines.push(`${g.label}: ${g.items.join(", ")}`);
    }
    for (const e of s.entries) {
      lines.push(`${e.org}${e.place ? ` – ${e.place}` : ""} [${e.id}]`);
      lines.push(`${e.title}${e.note ? ` (${e.note})` : ""}    ${e.period}`);
      for (const b of e.bullets) lines.push(`• ${b.text} [${b.id}]`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
