import type { Project } from "@/content/projects";

/**
 * Each project in the shape Upwork's and Contra's portfolio forms ask for. Neither can import a file,
 * so this is copy-ready text plus the images, generated from the published projects on every view.
 * To change the wording, edit the project, or the rules and overrides below.
 */

/**
 * Upwork's own pages disagree on these (the help center says 70/100/600, its portfolio guide 40/≤300).
 * Check the live form once and set the real numbers here.
 */
export const UPWORK = { title: 70, role: 100, description: 600, skills: 5 } as const;
export const CONTRA = { roles: 3 } as const;

/** Where a derived field reads wrong, say what it should be. */
const OVERRIDES: Record<string, Partial<{ title: string; roles: string[]; skills: string[]; description: string }>> = {
  sidaku: { roles: ["Android developer", "Backend developer"] },
  breel: { roles: ["Team lead", "Android developer", "Product designer"] },
};

export type Field = { label: string; value: string; limit?: number };
export type ExportImage = { src: string; name: string; label: string };
export type ProjectExport = {
  slug: string;
  title: string;
  period: string;
  images: ExportImage[];
  upwork: { title: Field; role: Field; description: Field; skills: string[] };
  contra: { title: Field; description: Field; tools: string[]; roles: string[]; duration: Field; link: Field };
};

const STOP = new Set(["and", "app", "web", "the"]);

/** "AgentFlow: AI platform", unless the title already says what kind of thing it is. */
function title(p: Project) {
  const words = p.kind.toLowerCase().split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  const says = words.some((w) => p.title.toLowerCase().includes(w));
  return says ? p.title : `${p.title}: ${p.kind}`;
}

/** The summary, then the first paragraph of what Novel did, while it fits; else the summary cut at a sentence. */
function description(p: Project, limit: number) {
  const full = [p.summary, p.part[0]].filter(Boolean).join("\n\n");
  if (full.length <= limit) return full;
  if (p.summary.length <= limit) return p.summary;
  const sentences = p.summary.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [p.summary];
  let out = "";
  for (const s of sentences) {
    if ((out + s).trim().length > limit) break;
    out += s;
  }
  return out.trim() || p.summary.slice(0, limit);
}

/** "Team lead, Android developer and designer" → the part before the comma, split on "and". */
function roles(p: Project) {
  const head = p.role.split(",")[0].replace(/\(.*?\)/g, "").trim();
  return head
    .split(/\s+and\s+/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r[0].toUpperCase() + r.slice(1))
    .slice(0, CONTRA.roles);
}

const fileName = (index: number, slug: string, ext = "jpg") => `${String(index + 1).padStart(2, "0")}-${slug}.${ext}`;

/** The cover first (the device render, or the cover shot), then each chapter's shot in page order. */
export function exportImages(p: Project): ExportImage[] {
  const out: ExportImage[] = [];
  const seen = new Set<string>();
  const add = (src: string | undefined, id: string, label: string) => {
    if (!src || seen.has(src)) return;
    seen.add(src);
    out.push({ src, name: fileName(out.length, id), label });
  };
  add(p.art?.real ?? p.cover?.src, "cover", "Cover");
  for (const chapter of p.chapters) add(chapter.shot?.src, chapter.id, chapter.title);
  return out;
}

export function projectExport(p: Project, origin: string): ProjectExport {
  const o = OVERRIDES[p.slug] ?? {};
  const t = o.title ?? title(p);
  const skills = (o.skills ?? p.stack).slice(0, UPWORK.skills);
  return {
    slug: p.slug,
    title: p.title,
    period: p.period,
    images: exportImages(p),
    upwork: {
      title: { label: "Project title", value: t, limit: UPWORK.title },
      role: { label: "Your role", value: p.role, limit: UPWORK.role },
      description: { label: "Project description", value: o.description ?? description(p, UPWORK.description), limit: UPWORK.description },
      skills,
    },
    contra: {
      title: { label: "Title", value: t },
      description: { label: "Short description", value: p.summary },
      tools: p.stack,
      roles: o.roles ?? roles(p),
      duration: { label: "Duration", value: p.period },
      link: { label: "Link", value: `${origin}/projects/${p.slug}` },
    },
  };
}

