import { z } from "zod";

/**
 * The editable content: the site's copy, the master CV and the projects. These schemas check every save
 * (from the dashboard and from agents over MCP), give the content its TypeScript types, and lay out the
 * dashboard's editor: `title` and `description` label a field, `widget` picks its control, and
 * `advanced` folds it away. The lists below are code rather than content: pages and filters are built
 * around them, so they change with the code.
 */

export const CV_TAGS = [
  "frontend",
  "backend",
  "mobile",
  "desktop",
  "ai",
  "product",
  "design",
  "performance",
  "fintech",
  "health",
  "client",
  "leadership",
  "testing",
  "analytics",
] as const;
/** Leadership lives inside Education (the student organisations) and Awards, which keeps the CV compact. */
export const CV_SECTIONS = ["skills", "experience", "projects", "education", "awards"] as const;
export const CV_ENTRY_SECTIONS = ["experience", "projects", "education", "awards"] as const;
export const SECTION_TITLES: Record<(typeof CV_SECTIONS)[number], string> = {
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  awards: "Awards and Certifications",
  skills: "Skills",
};
/** Four bullets is the most an entry should carry; five only for a lead role where every line is strong. */
export const MAX_BULLETS = 5;
export const PLATFORMS = ["Web", "Mobile", "Desktop"] as const;
export const CONTEXTS = ["Multimodal", "Client work", "Side project", "Study"] as const;
export const CAREER_KINDS = ["Full-time", "Freelance", "Program", "Degree"] as const;
export const MODES = ["freelance", "fulltime"] as const;
/** Where a testimonial shows: one mode or both. */
export const SHOWN_IN = ["both", "freelance", "fulltime"] as const;

/** How the dashboard's editor shows a field. */
export type FieldMeta = {
  title?: string;
  description?: string;
  widget?: "textarea" | "image";
  advanced?: boolean;
  /** Words for a choice's values, e.g. { fulltime: "Full-time" }. */
  labels?: Record<string, string>;
};

const required = "Required.";
const line = (m: FieldMeta = {}) => z.string().min(1, required).meta(m);
const text = (m: FieldMeta = {}) => z.string().meta(m);
const paragraph = (m: FieldMeta = {}) => z.string().min(1, required).meta({ widget: "textarea", ...m });
const image = (m: FieldMeta = {}) =>
  z.string().min(1, required).meta({ widget: "image", description: "A path under public/ (/projects/…) or a full URL.", ...m });
const id = (m: FieldMeta = {}) =>
  z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters and digits, joined by dashes.")
    .meta(m);
const link = () => z.object({ label: line(), href: line() });
const weight = (m: FieldMeta = {}) => z.union([z.literal(1), z.literal(2), z.literal(3)]).meta(m);
const size = () => z.number().int().positive();

/** Flags each value that appears twice, at its own path. */
function unique(ctx: z.RefinementCtx, values: string[], path: (i: number) => (string | number)[], what: string) {
  const seen = new Set<string>();
  values.forEach((v, i) => {
    if (seen.has(v)) ctx.addIssue({ code: "custom", message: `Another ${what} already uses "${v}".`, path: path(i) });
    seen.add(v);
  });
}

/* ── Site ─────────────────────────────────────────────────────────────── */

const careerRoleSchema = z.object({
  period: line(),
  role: line(),
  org: line({ title: "Organisation" }),
  place: text().optional(),
  kind: z.enum(CAREER_KINDS).meta({ description: "Only where the profile or CV says so." }).optional(),
  points: z.array(paragraph()),
  href: text({ title: "Case study", description: "A case study this role is told through, e.g. /projects/agentflow." }).optional(),
});

const modeCopySchema = z.object({
  label: line(),
  hero: z.object({ lead: line(), mark: line({ description: "Gets the highlight bar." }), rest: line() }),
  chip: line(),
  detail: z.object({ body: paragraph(), href: line({ title: "Link" }), cta: line({ title: "Link text" }) }),
  talk: z.object({ title: line(), body: paragraph() }),
});

export const siteSchema = z
  .object({
    site: z
      .object({
        name: line(),
        role: line(),
        title: line({ description: "The browser tab and search results." }),
        description: paragraph({ description: "The search and link-preview description." }),
        location: line(),
        email: z.email("An email address.").meta({ description: "Shown on the site and the CV; the contact form and setup links go here." }),
        social: z
          .object({ github: text({ title: "GitHub" }), linkedin: text({ title: "LinkedIn" }), instagram: text(), upwork: text() })
          .meta({ description: "Profile URLs. An empty one shows as a plain icon." }),
      })
      .meta({ title: "Basics" }),
    about: paragraph({ description: "The Career page's introduction and the portfolio deck's About slide." }),
    philosophy: z
      .object({
        title: line(),
        lede: paragraph(),
        span: z.array(line()).meta({ description: "The stages the work covers." }),
        steps: z.array(z.object({ title: line(), body: paragraph() })),
        pledge: z.object({ lead: line(), mark: line({ description: "Gets the highlight bar." }) }),
        pledgeNote: paragraph(),
      })
      .meta({ title: "How I work" }),
    testimonials: z.array(
      z.object({
        quote: paragraph(),
        name: line(),
        relation: line(),
        role: line(),
        avatar: image({ description: "Optional; without one the card shows initials." }).optional(),
        mode: z.enum(SHOWN_IN).meta({
          title: "Shown in",
          description: "Which way of reading the site shows it: Freelance, Full-time, or both.",
          labels: { both: "Both modes", freelance: "Freelance", fulltime: "Full-time" },
        }),
      }),
    ),
    modes: z
      .object({ freelance: modeCopySchema, fulltime: modeCopySchema })
      .meta({ description: "The copy that changes with Freelance and Full-time mode." }),
    career: z.array(careerRoleSchema).meta({ title: "Career (home page)", description: "Full-time mode's career list, newest first." }),
    careerDetail: z
      .array(z.object({ id: id(), heading: line(), roles: z.array(careerRoleSchema) }))
      .meta({ title: "Career page", description: "Every role with what you did there, in groups." }),
  })
  .superRefine((v, ctx) =>
    unique(
      ctx,
      v.careerDetail.map((g) => g.id),
      (i) => ["careerDetail", i, "id"],
      "group",
    ),
  );

/* ── CV ───────────────────────────────────────────────────────────────── */

const cvTag = z.enum(CV_TAGS);

const cvBulletSchema = z.object({
  id: id({ description: "Tailored CVs pick lines by this id, so changing it drops the line from links that use it." }),
  text: paragraph({ description: "Lead with the result." }),
  tags: z.array(cvTag),
  weight: weight({ description: "How strong the line is on its own: 3 leads, and the default CV uses the heaviest." }),
});

const cvEntrySchema = z.object({
  id: id({ description: "Tailored CVs pick entries by this id." }),
  section: z.enum(CV_ENTRY_SECTIONS),
  org: line({ title: "Organisation" }),
  place: text().optional(),
  titles: z.array(line()).min(1, "At least one title.").meta({ description: "Titles this role can honestly go by; the first is the default." }),
  period: line(),
  note: text({ description: 'A short qualifier after the title, e.g. "Freelance".' }).optional(),
  link: text({ title: "Case study", description: "A page on the site, e.g. /projects/agentflow." }).optional(),
  proof: text({ description: "The certificate, as an image path under public/certificates." }).optional(),
  about: paragraph({ description: "One line on what the organisation is." }).optional(),
  stack: z.array(line()).meta({ description: 'Most telling first; shown as the "Tech:" line.' }).optional(),
  tags: z.array(cvTag),
  weight: weight({ description: "How strong the entry is overall; the default CV leaves out the lightest." }),
  bulletCap: z.number().int().min(1).max(5).meta({ title: "Bullet cap", description: "Most bullets the default CV shows." }).optional(),
  bullets: z.array(cvBulletSchema),
});

const cvSkillGroupSchema = z.object({ id: id(), label: line(), items: z.array(line()) });

export const cvSchema = z
  .object({
    header: z.object({
      name: line(),
      headlines: z.array(line()).min(1).meta({ description: "Headlines a tailored CV may choose from." }),
      location: line(),
      email: z.email("An email address."),
      site: link().meta({ description: "The portfolio, shown beside the email; it stays when contact details are hidden." }),
      links: z.array(link()),
    }),
    summaries: z.array(z.object({ id: id(), text: paragraph(), tags: z.array(cvTag) })).min(1),
    entries: z.array(cvEntrySchema),
    skills: z.array(cvSkillGroupSchema),
  })
  .superRefine((v, ctx) => {
    unique(
      ctx,
      v.entries.map((e) => e.id),
      (i) => ["entries", i, "id"],
      "entry",
    );
    v.entries.forEach((e, i) =>
      unique(
        ctx,
        e.bullets.map((b) => b.id),
        (j) => ["entries", i, "bullets", j, "id"],
        "line in this entry",
      ),
    );
    unique(
      ctx,
      v.summaries.map((s) => s.id),
      (i) => ["summaries", i, "id"],
      "summary",
    );
    unique(
      ctx,
      v.skills.map((g) => g.id),
      (i) => ["skills", i, "id"],
      "skill group",
    );
  });

/* ── Projects ─────────────────────────────────────────────────────────── */

/** Where an image sits inside a frame, in design px (see `--s` in globals.css). */
const placementSchema = z.object({ w: z.number(), h: z.number(), x: z.number(), y: z.number() });

const shotSchema = z.object({
  src: image(),
  width: size(),
  height: size(),
  alt: line({ description: "What the image shows, for screen readers." }),
  caption: text().optional(),
});

const artSchema = z
  .object({
    real: image({ description: "Full-colour render with the real product on screen." }),
    abstract: image({ description: "Flat two-tone twin of the same render; the real one opens over it." }),
    width: size(),
    height: size(),
    circle: z
      .object({ x: z.number(), y: z.number(), r: z.number(), drawn: z.boolean() })
      .meta({ description: "The circle the reveal grows from, as fractions of the image; drawn circles are painted by the page." }),
    alt: line(),
  })
  .meta({ title: "Device render", description: "Featured projects only.", advanced: true });

const chapterSchema = z.object({
  id: id(),
  title: line(),
  problem: paragraph(),
  did: z.array(paragraph()).meta({ title: "What I did" }),
  result: paragraph(),
  figure: z
    .object({ from: text().optional(), to: line(), label: line() })
    .meta({ description: "One before/after figure, set large beside the result." })
    .optional(),
  bars: z
    .array(z.object({ label: line(), value: z.number(), note: line() }))
    .meta({ description: "A small data graphic instead of a screenshot." })
    .optional(),
  shot: shotSchema.meta({ title: "Screenshot" }).optional(),
});

const partSchema = z.object({
  from: id({ description: "The chapter id this part opens at." }),
  title: line(),
  period: line(),
  lede: paragraph(),
});

const projectSchema = z.object({
  slug: id({ description: "The page address, /projects/<slug>. Tailored links and short links may point at it." }),
  title: line(),
  fullName: text({ title: "Full name", description: "When the title is an acronym." }).optional(),
  client: line(),
  period: line(),
  role: line(),
  tag: line({ description: "One line for the home grid chip." }),
  year: line({ description: "For the projects index." }),
  kind: line({ description: "What kind of thing it is, for the projects index." }),
  stat: z.object({ value: line(), label: line() }).meta({ description: "The one number that sums it up." }),
  platform: z.enum(PLATFORMS),
  context: z.enum(CONTEXTS),
  summary: paragraph(),
  stack: z.array(line()),
  intro: z.array(paragraph()),
  part: z.array(paragraph()).meta({ title: "My part" }),
  links: z.array(link()).optional(),
  art: artSchema.optional(),
  card: z
    .object({ w: z.number(), h: z.number(), place: placementSchema, mobileH: z.number() })
    .meta({ title: "Home grid card", description: "Card size and image crop, in design px.", advanced: true })
    .optional(),
  hero: placementSchema.meta({ title: "Hero crop", description: "Inside the 1240×700 frame, in design px.", advanced: true }).optional(),
  cover: shotSchema.meta({ description: "Projects without a device render: a screenshot or design board." }).optional(),
  chapters: z.array(chapterSchema),
  parts: z.array(partSchema).meta({ description: "For projects told in parts." }).optional(),
  status: z
    .object({ label: line(), note: paragraph() })
    .meta({ description: "Work still being built, said plainly on the card and the page." })
    .optional(),
  method: paragraph({ description: "How the work was done, where it is worth saying." }).optional(),
});

export const projectsSchema = z
  .object({ projects: z.array(projectSchema).meta({ description: "In the order the site lists them." }) })
  .superRefine((v, ctx) => {
    unique(
      ctx,
      v.projects.map((p) => p.slug),
      (i) => ["projects", i, "slug"],
      "project",
    );
    v.projects.forEach((p, i) => {
      unique(
        ctx,
        p.chapters.map((c) => c.id),
        (j) => ["projects", i, "chapters", j, "id"],
        "chapter",
      );
      p.parts?.forEach((part, j) => {
        if (!p.chapters.some((c) => c.id === part.from))
          ctx.addIssue({ code: "custom", message: `No chapter "${part.from}" in this project.`, path: ["projects", i, "parts", j, "from"] });
      });
    });
  });

/* ── Documents ────────────────────────────────────────────────────────── */

export const CONTENT_DOCS = {
  site: { label: "Site", schema: siteSchema },
  cv: { label: "CV", schema: cvSchema },
  projects: { label: "Projects", schema: projectsSchema },
} as const;
export type DocId = keyof typeof CONTENT_DOCS;
export const DOC_IDS = Object.keys(CONTENT_DOCS) as DocId[];
export const isDocId = (v: unknown): v is DocId => typeof v === "string" && v in CONTENT_DOCS;

export type SiteContent = z.infer<typeof siteSchema>;
export type CvContent = z.infer<typeof cvSchema>;
export type ProjectsContent = z.infer<typeof projectsSchema>;
export type DocContent = { site: SiteContent; cv: CvContent; projects: ProjectsContent };

export type Mode = (typeof MODES)[number];
export type CareerRole = z.infer<typeof careerRoleSchema>;
export type Testimonial = SiteContent["testimonials"][number];
export type CvTag = (typeof CV_TAGS)[number];
export type CvSectionId = (typeof CV_SECTIONS)[number];
export type CvEntrySection = (typeof CV_ENTRY_SECTIONS)[number];
export type CvBullet = z.infer<typeof cvBulletSchema>;
export type CvEntry = z.infer<typeof cvEntrySchema>;
export type CvSkillGroup = z.infer<typeof cvSkillGroupSchema>;
export type CvHeader = CvContent["header"];
export type CvSummary = CvContent["summaries"][number];
export type Platform = (typeof PLATFORMS)[number];
export type Context = (typeof CONTEXTS)[number];
export type Placement = z.infer<typeof placementSchema>;
export type Art = z.infer<typeof artSchema>;
export type Shot = z.infer<typeof shotSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type Part = z.infer<typeof partSchema>;
export type Project = z.infer<typeof projectSchema>;
