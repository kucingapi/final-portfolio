import { createHash, timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Operation } from "rfc6902";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { at, describeChanges } from "@/lib/content/changes";
import { ContentError, changes, getState, patchDraft, publishedValue } from "@/lib/content/store";
import { CV_SECTIONS, CV_TAGS } from "@/lib/content/schema";
import { leading, statOf } from "@/content/projects";
import { getCvContent, getProjects, getSiteContent } from "@/lib/content/read";
import { pickChapters, pickProjects } from "@/lib/portfolio/pdf";
import { linkRoles, tailorRoles, roleLines } from "@/lib/cv/career";
import { renderCvPdf } from "@/lib/cv/pdf";
import { deleteVariant, getActivity, getVariant, listVariants, saveVariant, type StoredVariant } from "@/lib/cv/store";
import { variantSchema } from "@/lib/cv/schema";
import { checkVariant, cvToText, normalizeVariant, type Variant } from "@/lib/cv/variant";
import { cvIn, cvPdfIn, namesIn, otherLang } from "@/lib/cv/localized";
import { translationRows, saveTranslations } from "@/lib/content/translations";
import { LANGS, localePath, type Lang } from "@/lib/i18n/lang";
import { JOB_STATUSES, JobError, createJob, listJobs, recordApplication, updateJob, withTotals } from "@/lib/dashboard/jobs";

/**
 * MCP server for tailoring the CV and the site to one application. An agent reads the master CV,
 * previews a variant (text plus PDF page count), saves it, and gets back a link with an opaque code
 * (`/?v=k7qx2pmd`) that is all a recruiter ever sees. Stateless Streamable HTTP; every request needs
 * `Authorization: Bearer $CV_MCP_TOKEN`.
 */

const GUIDE = `How to tailor:
- Read the job description and list its requirements, then pick what proves fit. Lead with impact: results and numbers first.
- Order matters. Within each section, put the entry closest to the job first (date order comes second), and within each entry, the bullet that answers its top requirement first. Pick the allowed title closest to the job's.
- Skills sit at the top: order the groups ("skills") and the items in each ("skillItems") so the job's tools come first, and order each entry's "Tech:" line ("stacks") the same way.
- Write a "summary" for the job that covers every requirement the CV can back up, in the job's own words where true.
- Four bullets per entry at most; five only for the lead role when every line is strong.
- Every CV shows the degree's GPA. "courses" adds "Relevant coursework" under an education entry (the brawijaya degree has them), one line per course: "Title (A, 4 credits): what I built or did in it". Pick the 2–4 courses whose "about" (the faculty's own description) and "text" best match the job's requirements, the closest first, preferring A grades when two fit equally; 5 at most. Each takes a line or two, so make room: the degree's own bullets can go ("bullets": {"brawijaya": []}) when the courses matter more for the job. Leave courses out when the experience already proves the requirements, or for senior roles; they help most where a job asks for a degree, a field (databases, networking, security, data, mobile, UI) or fundamentals the work history doesn't show.
- The CV must be exactly 2 pages: preview_cv reports the page count; trim bullets or entries until it is 2. It also reports the other language (a visitor who switches downloads that one), which drops its least relevant lines on its own to fit; trim further if it would drop a line that matters.
- Only pick, order and choose between existing lines (entry ids, bullet ids, allowed titles, skill group ids and items, stack items, course ids). Never invent facts; free text is limited to "headline" and "summary", and those must stay true to the master CV.
- "projects" orders the site's projects for this visitor, most relevant first. Every project has a device render, and the first four lead: the home page's project grid and the large rows of the projects page. The first three make the portfolio PDF deck. "mode" sets which way the site opens (fulltime for employers, freelance for clients).
- "stats" gives a project another headline number, on the projects page and in the deck: the chapter whose figure answers the job's top requirement (only chapters with a figure). "chapters" picks the deck's slides for a project: up to three chapter ids, in order, the ones that prove what the job asks for.
- The site's career (the Career page, and the home page in Full-time mode) follows the CV: a role that stands for a CV entry ("career" in get_cv_master) shows the title you chose for that entry and the lines you picked for it, and those roles lead in the order of "entries".
- For Upwork and other platforms that bar sharing contact details, set "contact": false. It hides the email, GitHub and LinkedIn on the CV and both PDFs.
- For an Indonesian employer, set "lang": "id". The link then opens the site in Bahasa Indonesia (/id), and the CV and the portfolio deck come in Bahasa. Write "headline" and "summary" in Bahasa; everything else is picked by id as usual, and titles and skills may be named in English or in Bahasa (get_cv_master with lang "id" shows the Bahasa). Preview it: the 2-page limit holds in Bahasa too, and Bahasa runs longer.
- The label is private (e.g. "Acme, Senior Frontend, 2026-11"); the visitor never sees it.`;

const JOBS_GUIDE = `Tracking applications:
- When a tailored CV is for a job application, pass "job" (company, title, and the posting's url) to save_cv_variant. The dashboard's Jobs view then shows the job with the link and how often it was opened; a second CV for the same posting joins the same job.
- list_jobs shows every job with its opens, downloads and clicks; save_job adds one by hand or updates it (status: saved, applied, interviewing, offer, rejected, closed).`;

const CONTENT_GUIDE = `Editing the site's content:
- Three documents: "site" (the site's copy), "cv" (the master CV that tailored CVs pick from) and "projects" (the case studies, in the order the site lists them).
- Read with get_content first, then edit with edit_content: RFC 6902 JSON Patch operations and the rev you read. Paths are JSON Pointers into the document, e.g. /projects/2/summary or /entries/0/bullets/1/text.
- Edits only ever change a draft. Novel reviews and publishes drafts in the dashboard (Content), so say what you changed and ask Novel to publish it.
- Stay true to the record: improve wording, order and structure; never invent facts or numbers. Tailored links refer to ids (project slugs, CV entry and bullet ids), so leave those as they are.
- The site also reads in Bahasa Indonesia (/id). Its words live in a fourth document, "bahasa": English text → Bahasa, for site, cv and projects alike. Read it with get_translations (missing: true lists what still shows in English) and change it with edit_translations; both work on a draft Novel publishes like the rest. A changed English line needs its translation again: the old one no longer matches and the line shows in English until then. Testimonials stay as they were said, ids, links, tool names and dates are never translated (dates turn into Bahasa month names on their own).
- Bahasa style: speak to the reader as "Anda" and of Novel as "saya"; plain, natural Indonesian, not word for word; keep tech terms and product names in English (frontend, backend, design system, dashboard, AgentFlow); keep every number and fact exactly; no em dashes.`;

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });

function links(origin: string, code: string, lang: Lang = "en") {
  return {
    site: `${origin}${lang === "en" ? "/" : localePath(lang, "/")}?v=${code}`,
    cv: `${origin}${localePath(lang, "/cv")}?v=${code}`,
    pdf: `${origin}/api/cv?v=${code}&download=1`,
    portfolio: `${origin}/api/portfolio?v=${code}&download=1`,
  };
}

/** What the variant does to the site and the deck, for an agent to check alongside the CV. */
async function sitePreview(variant: Variant) {
  const [projects, cv, { careerDetail }] = await Promise.all([getProjects(), getCvContent(), getSiteContent()]);
  const lead = (variant.projects ?? []).map((slug) => projects.find((p) => p.slug === slug)).filter((p) => p !== undefined);
  const ordered = [...lead, ...projects.filter((p) => !lead.includes(p))];
  const all = careerDetail.flatMap((g) => g.roles);
  const links = linkRoles(all, cv);
  const lines = roleLines(cv, links);
  let start = 0;
  return {
    leading: leading(ordered).map((p) => p.slug),
    deck: pickProjects(projects, variant, 3).map((p) => ({
      project: p.slug,
      stat: statOf(p, variant.stats?.[p.slug]),
      chapters: pickChapters(p, 3, variant.chapters?.[p.slug]).map((c) => c.id),
    })),
    careerPage: careerDetail.map((g) => {
      const roles = tailorRoles(g.roles, links.slice(start, start + g.roles.length), lines, variant);
      start += g.roles.length;
      return { group: g.heading, roles: roles.map((r) => ({ org: r.org, role: r.role, points: r.points.length })) };
    }),
  };
}

/** A variant with any Bahasa titles, skills or headline named in English, as the master CV has them. */
async function normalized(variant: Variant): Promise<Variant> {
  return variant.lang && variant.lang !== "en" ? normalizeVariant(variant, await namesIn(variant.lang)) : variant;
}

async function preview(given: Variant, origin: string) {
  const variant = await normalized(given);
  const [content, projects] = await Promise.all([getCvContent(), getProjects()]);
  const errors = checkVariant(content, variant, projects);
  const lang = variant.lang ?? "en";
  const cv = await cvIn(lang, variant);
  const [{ pages }, other] = await Promise.all([renderCvPdf(cv, origin), cvPdfIn(otherLang(lang), variant, undefined, origin)]);
  return {
    variant,
    errors,
    pages,
    fitsTwoPages: pages === 2,
    // Visitors on the other language's pages download it in that language.
    otherLanguage: {
      lang: other.cv.lang,
      pages: other.pages,
      linesLeftOut: other.cut,
      note: other.cut
        ? `Its PDF leaves out ${other.cut} line(s) (the last of the longest entries) to stay at 2 pages; pick fewer lines to choose which go.`
        : undefined,
    },
    text: cvToText(cv),
    site: await sitePreview(variant),
  };
}

function buildServer(origin: string) {
  const server = new McpServer({ name: "novel-cv", version: "1.0.0" }, { instructions: [GUIDE, JOBS_GUIDE, CONTENT_GUIDE].join("\n\n") });

  server.registerTool(
    "get_cv_master",
    {
      title: "Read the master CV",
      description:
        "Everything that can go on the CV, with ids: entries (by section) and their bullets with tags and weight (3 = strongest), the degree's courses with what each covers, allowed titles, stock headlines and summaries, skill groups, the site's projects with their chapters and figures, and the site's career roles with the CV entry each follows. Read this first. With lang \"id\", the words are in Bahasa Indonesia (the ids are the same).",
      inputSchema: { lang: z.enum(LANGS).optional().describe("en (default) or id: the language to read the words in.") },
      annotations: { readOnlyHint: true },
    },
    async ({ lang = "en" }) => {
      const [cv, projects, { careerDetail }, cvEn, siteEn] = await Promise.all([
        getCvContent(lang),
        getProjects(lang),
        getSiteContent(lang),
        getCvContent(),
        getSiteContent(),
      ]);
      const roles = careerDetail.flatMap((g) => g.roles.map((r) => ({ group: g.heading, r })));
      // Roles are matched to CV entries in English; a translation keeps every list in the same order.
      const links = linkRoles(
        siteEn.careerDetail.flatMap((g) => g.roles),
        cvEn,
      );
      return json({
        guide: GUIDE,
        lang,
        sections: CV_SECTIONS,
        tags: CV_TAGS,
        headlines: cv.header.headlines,
        summaries: cv.summaries,
        entries: cv.entries,
        skills: cv.skills,
        projects: projects.map((p) => ({
          slug: p.slug,
          title: p.title,
          kind: p.kind,
          platform: p.platform,
          context: p.context,
          year: p.year,
          status: p.status?.note,
          stat: `${p.stat.value} ${p.stat.label}`,
          summary: p.summary,
          render: Boolean(p.art),
          chapters: p.chapters.map((c) => ({
            id: c.id,
            title: c.title,
            figure: c.figure ? `${statOf(p, c.id).value} ${statOf(p, c.id).label}` : undefined,
          })),
        })),
        career: roles.map((x, i) => ({ group: x.group, org: x.r.org, role: x.r.role, period: x.r.period, cvEntry: links[i] ?? undefined })),
        defaultVariant: "Leave any field out to use the default: entries with weight >= 2, their strongest bullets (4 per role, 5 for the lead one; in Bahasa one fewer for the lead role and each education entry), no coursework, skills first, then every section.",
      });
    },
  );

  server.registerTool(
    "preview_cv",
    {
      title: "Preview a CV variant",
      description:
        "Render a variant without saving it: the CV as text (with ids) in the variant's language, its PDF page count, any validation errors, and what it does to the site: the four projects that lead, the deck's projects with their headline number and chapters, and the Career page's roles in order.",
      inputSchema: { variant: variantSchema },
      annotations: { readOnlyHint: true },
    },
    async ({ variant }) => json(await preview(variant, origin)),
  );

  server.registerTool(
    "save_cv_variant",
    {
      title: "Save a CV variant",
      description:
        "Create a variant (omit code; pass claim to choose its code) or replace one (pass its code). Refuses invalid ids. Returns the code, the links to send (site, CV page, CV PDF, portfolio PDF) and the page count.",
      inputSchema: {
        label: z.string().trim().min(1).max(120).describe("Private note: who this is for."),
        variant: variantSchema,
        code: z.string().max(16).optional().describe("Existing code to replace; omit to create a new one."),
        claim: z.string().max(16).optional().describe("Unused code to create the variant under, e.g. for a link already sent; refused if invalid or taken."),
        job: z
          .object({
            company: z.string().trim().min(1).max(120),
            title: z.string().trim().min(1).max(160).describe("The role."),
            url: z.string().url().optional().describe("The job posting."),
            status: z.enum(JOB_STATUSES).optional().describe("Default applied."),
          })
          .optional()
          .describe("The job this CV is for. Recorded in the dashboard's Jobs view with this link; the same posting reuses its job."),
      },
    },
    async ({ label, variant, code, claim, job }) => {
      const result = await preview(variant, origin);
      if (result.errors.length) return fail(`Not saved. Fix these first:\n${result.errors.join("\n")}`);
      try {
        const row = await saveVariant({ code, claim, label, variant: result.variant });
        const recorded = job ? await recordApplication(row.code, job) : undefined;
        return json({
          code: row.code,
          label: row.label,
          lang: row.variant.lang ?? "en",
          links: links(origin, row.code, row.variant.lang),
          pages: result.pages,
          job: recorded && { id: recorded.id, company: recorded.company, title: recorded.title, status: recorded.status },
          warning: result.fitsTwoPages ? undefined : `The CV is ${result.pages} page(s); it should be 2.`,
        });
      } catch (e) {
        return fail(e instanceof Error ? e.message : "Could not save.");
      }
    },
  );

  server.registerTool(
    "list_cv_variants",
    {
      title: "List CV variants",
      description:
        "Every saved variant, newest first, with its private label, links and activity: how often the link was opened (first and last time) and its CV and portfolio PDFs fetched. Novel's own visits are not counted.",
      annotations: { readOnlyHint: true },
    },
    async () =>
      json(
        await Promise.all(
          (await listVariants()).map(async (r: StoredVariant) => ({
            code: r.code,
            label: r.label,
            updatedAt: r.updatedAt,
            activity: await getActivity(r.code),
            lang: r.variant.lang ?? "en",
            links: links(origin, r.code, r.variant.lang),
          })),
        ),
      ),
  );

  server.registerTool(
    "get_cv_variant",
    {
      title: "Get a CV variant",
      description: "One saved variant by code, with its label, fields and activity.",
      inputSchema: { code: z.string().max(16) },
      annotations: { readOnlyHint: true },
    },
    async ({ code }) => {
      const row = await getVariant(code);
      return row
        ? json({ ...row, activity: await getActivity(row.code), links: links(origin, row.code, row.variant.lang) })
        : fail(`No variant with code "${code}".`);
    },
  );

  server.registerTool(
    "delete_cv_variant",
    {
      title: "Delete a CV variant",
      description: "Delete a variant. Its link falls back to the default site and CV.",
      inputSchema: { code: z.string().max(16) },
      annotations: { destructiveHint: true },
    },
    async ({ code }) => ((await deleteVariant(code)) ? json({ deleted: code }) : fail(`No variant with code "${code}".`)),
  );

  server.registerTool(
    "list_jobs",
    {
      title: "List job applications",
      description:
        "Every job in the dashboard, newest first: company, role, posting, status, the day it was applied, the links sent with it (cv:<code>, go:<name>) and their totals: tailored-link opens, CV and portfolio downloads, short-link clicks, and the last time anything happened.",
      annotations: { readOnlyHint: true },
    },
    async () => json(await withTotals(await listJobs())),
  );

  server.registerTool(
    "save_job",
    {
      title: "Add or update a job",
      description:
        "Add a job (omit id) or change one (pass its id): any of company, title, url, status, appliedOn (2026-11-04), links (cv:<code> and go:<name>; replaces the list), notes.",
      inputSchema: {
        id: z.string().optional().describe("The job to change; omit to add one."),
        company: z.string().optional(),
        title: z.string().optional().describe("The role."),
        url: z.string().optional().describe("The job posting."),
        status: z.enum(JOB_STATUSES).optional(),
        appliedOn: z.string().optional(),
        links: z.array(z.string()).optional(),
        notes: z.string().optional(),
      },
    },
    async ({ id, ...fields }) => {
      try {
        return json(id ? await updateJob(id, fields) : await createJob(fields));
      } catch (e) {
        if (e instanceof JobError) return fail(e.message);
        throw e;
      }
    },
  );

  const doc = z
    .enum(["site", "cv", "projects", "bahasa"])
    .describe("site: the site's copy; cv: the master CV; projects: the case studies; bahasa: their Bahasa Indonesia (edit it with edit_translations).");

  server.registerTool(
    "get_content",
    {
      title: "Read the site's content",
      description:
        "A content document as JSON, with the rev to pass to edit_content. By default the draft when there is one (edits apply to it), otherwise the published copy. `path`, a JSON Pointer such as /projects/2, reads one part.",
      inputSchema: {
        doc,
        path: z.string().optional().describe("JSON Pointer into the document, e.g. /projects/0/chapters. Omit for all of it."),
        version: z.enum(["draft", "published"]).optional().describe("draft (default): the draft if there is one. published: what the site shows."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ doc, path, version }) => {
      const state = await getState(doc);
      const base = version === "published" ? await publishedValue(doc) : state.value;
      const value = path ? at(base, path) : base;
      if (value === undefined) return fail(`Nothing at ${path} in ${doc}.`);
      return json({ doc, rev: state.rev, published: state.published, draft: state.draft, path: path ?? "", value });
    },
  );

  server.registerTool(
    "edit_content",
    {
      title: "Edit the site's content (as a draft)",
      description:
        "Change a content document with RFC 6902 JSON Patch operations. The change goes to a draft that Novel reviews and publishes in the dashboard; the site doesn't change until then. Pass the rev from get_content: if the document changed since, nothing is saved and you read it again. Every edit is checked against the content's schema.",
      inputSchema: {
        doc,
        rev: z.number().int().describe("The rev get_content returned."),
        patch: z
          .array(
            z.object({
              op: z.enum(["add", "remove", "replace", "move", "copy", "test"]),
              path: z.string().describe("JSON Pointer, e.g. /projects/2/summary; /- appends to a list."),
              value: z.unknown().optional(),
              from: z.string().optional().describe("For move and copy."),
            }),
          )
          .min(1)
          .max(200),
      },
    },
    async ({ doc, rev, patch }) => {
      try {
        const state = await patchDraft(doc, patch as Operation[], rev, "agent");
        const diff = await changes(doc);
        const list = describeChanges(diff.ops, diff.before, state.value);
        return json({
          saved: state.draft ? "draft" : "nothing to publish: the draft now matches the live copy",
          rev: state.rev,
          changesAgainstPublished: list.length,
          changes: list.slice(0, 40),
          next: "Tell Novel the draft is ready to review and publish in the dashboard, under Content.",
        });
      } catch (e) {
        if (e instanceof ContentError) return fail([e.message, ...e.issues.map((i) => `${i.path}: ${i.message}`)].join("\n"));
        throw e;
      }
    },
  );

  server.registerTool(
    "content_changes",
    {
      title: "See what a draft changes",
      description: "What the draft of a content document changes against the published copy: JSON Patch operations and a readable list. Empty when there is no draft.",
      inputSchema: { doc },
      annotations: { readOnlyHint: true },
    },
    async ({ doc }) => {
      const [state, diff] = await Promise.all([getState(doc), changes(doc)]);
      return json({ doc, rev: state.rev, draft: state.draft, ops: diff.ops, changes: describeChanges(diff.ops, diff.before, state.value) });
    },
  );

  server.registerTool(
    "get_translations",
    {
      title: "Read the Bahasa Indonesia translation",
      description:
        "Every English string of the site, the CV and the projects that the Bahasa site (/id) translates, each once, with where it first appears and its Bahasa (missing: it shows in English). Covers the English drafts too, so a new line can be translated before it is published. Returns the rev to pass to edit_translations.",
      inputSchema: {
        doc: z.enum(["site", "cv", "projects"]).optional().describe("Only the strings first seen in this document."),
        missing: z.boolean().optional().describe("Only the strings with no translation yet."),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ doc, missing }) => {
      const { state, rows } = await translationRows();
      const shown = rows.filter((r) => (!doc || r.doc === doc) && (!missing || !r.id));
      return json({
        rev: state.rev,
        published: state.published,
        draft: state.draft,
        total: rows.length,
        translated: rows.filter((r) => r.id).length,
        strings: shown,
      });
    },
  );

  server.registerTool(
    "edit_translations",
    {
      title: "Translate into Bahasa Indonesia (as a draft)",
      description:
        "Set Bahasa Indonesia for English strings of the site, the CV or the projects, by their exact English text from get_translations. An empty id removes a translation (the line shows in English). Saved as the draft of the bahasa document, which Novel reviews and publishes in the dashboard (Content → Bahasa). Pass the rev from get_translations.",
      inputSchema: {
        rev: z.number().int().describe("The rev get_translations returned."),
        strings: z
          .array(z.object({ en: z.string().min(1).describe("The English text, exactly."), id: z.string().describe("Its Bahasa Indonesia; empty to remove.") }))
          .min(1)
          .max(500),
      },
    },
    async ({ rev, strings }) => {
      try {
        const { rows } = await translationRows();
        const known = new Set(rows.map((r) => r.en));
        const unknown = strings.filter((x) => !known.has(x.en)).map((x) => x.en);
        if (unknown.length)
          return fail(`Nothing saved. These are not English strings of the site, CV or projects (copy them exactly from get_translations):\n${unknown.join("\n")}`);
        const state = await saveTranslations(Object.fromEntries(strings.map((x) => [x.en, x.id])), rev, "agent");
        const after = await translationRows();
        return json({
          saved: state.draft ? "draft" : "nothing to publish: the draft now matches the live copy",
          rev: state.rev,
          translated: after.rows.filter((r) => r.id).length,
          total: after.rows.length,
          next: "Tell Novel the Bahasa draft is ready to review and publish in the dashboard, under Content → Bahasa.",
        });
      } catch (e) {
        if (e instanceof ContentError) return fail([e.message, ...e.issues.map((i) => `${i.path}: ${i.message}`)].join("\n"));
        throw e;
      }
    },
  );

  return server;
}

function authorize(request: Request): Response | null {
  const expected = process.env.CV_MCP_TOKEN;
  if (!expected) {
    // Locally the endpoint is open, so it can be tried before a token exists; never in production.
    if (process.env.NODE_ENV === "production") return Response.json({ error: "CV_MCP_TOKEN is not set." }, { status: 503 });
    // Open to this machine only. A page that rebinds its own hostname to 127.0.0.1 reaches the dev server
    // as same-origin, but its requests still carry that hostname in Host (and Origin), so refuse them.
    return fromThisMachine(request)
      ? null
      : Response.json({ error: "Set CV_MCP_TOKEN to reach this endpoint from another host." }, { status: 403 });
  }
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return sameSecret(given, expected) ? null : Response.json({ error: "Unauthorized." }, { status: 401 });
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * True when Host, and Origin if the request has one, name this machine (on any port). An Origin of "null"
 * (a sandboxed frame, or a form posted from a page with no-referrer) could be any site, so it's refused.
 */
function fromThisMachine(request: Request) {
  const hostname = (value: string) => value.trim().toLowerCase().replace(/:\d+$/, "");
  if (!LOOPBACK.has(hostname(request.headers.get("host") ?? ""))) return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return LOOPBACK.has(new URL(origin).host.toLowerCase().replace(/:\d+$/, ""));
  } catch {
    return false;
  }
}

/** Compares in constant time (over hashes, so lengths don't leak either): `===` stops at the first wrong character. */
function sameSecret(given: string, expected: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

async function handle(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const server = buildServer(origin);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(request);
}

/**
 * Stateless, so the server never pushes anything: a GET stream would only send keep-alive pings until the
 * function times out, billed the whole time. The spec lets a server refuse it with 405; clients then use POST only.
 */
function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST, DELETE" } });
}

export { GET, handle as POST, handle as DELETE };
