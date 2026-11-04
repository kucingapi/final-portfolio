import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Operation } from "rfc6902";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { at, describeChanges } from "@/lib/content/changes";
import { getCvContent, getProjects } from "@/lib/content/read";
import { ContentError, changes, getState, patchDraft, publishedValue } from "@/lib/content/store";
import { CV_SECTIONS, CV_TAGS } from "@/lib/content/schema";
import { renderCvPdf } from "@/lib/cv/pdf";
import { deleteVariant, getActivity, getVariant, listVariants, saveVariant, type StoredVariant } from "@/lib/cv/store";
import { variantSchema } from "@/lib/cv/schema";
import { checkVariant, cvToText, resolveCv, type Variant } from "@/lib/cv/variant";

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
- The CV must be exactly 2 pages: preview_cv reports the page count; trim bullets or entries until it is 2.
- Only pick, order and choose between existing lines (entry ids, bullet ids, allowed titles, skill group ids and items, stack items). Never invent facts; free text is limited to "headline" and "summary", and those must stay true to the master CV.
- "projects" orders the site's projects page for this visitor (lead with the most relevant), and its first three are the three projects in the portfolio PDF deck. "mode" sets which way the site opens (fulltime for employers, freelance for clients).
- For Upwork and other platforms that bar sharing contact details, set "contact": false. It hides the email, GitHub and LinkedIn on the CV and both PDFs.
- The label is private (e.g. "Acme, Senior Frontend, 2026-11"); the visitor never sees it.`;

const CONTENT_GUIDE = `Editing the site's content:
- Three documents: "site" (the site's copy), "cv" (the master CV that tailored CVs pick from) and "projects" (the case studies, in the order the site lists them).
- Read with get_content first, then edit with edit_content: RFC 6902 JSON Patch operations and the rev you read. Paths are JSON Pointers into the document, e.g. /projects/2/summary or /entries/0/bullets/1/text.
- Edits only ever change a draft. Novel reviews and publishes drafts in the dashboard (Content), so say what you changed and ask Novel to publish it.
- Stay true to the record: improve wording, order and structure; never invent facts or numbers. Tailored links refer to ids (project slugs, CV entry and bullet ids), so leave those as they are.`;

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });

function links(origin: string, code: string) {
  return {
    site: `${origin}/?v=${code}`,
    cv: `${origin}/cv?v=${code}`,
    pdf: `${origin}/api/cv?v=${code}&download=1`,
    portfolio: `${origin}/api/portfolio?v=${code}&download=1`,
  };
}

async function preview(variant: Variant, origin: string) {
  const [content, projects] = await Promise.all([getCvContent(), getProjects()]);
  const errors = checkVariant(
    content,
    variant,
    projects.map((p) => p.slug),
  );
  const cv = resolveCv(content, variant);
  const { pages } = await renderCvPdf(cv, origin);
  return { errors, pages, fitsTwoPages: pages === 2, text: cvToText(cv) };
}

function buildServer(origin: string) {
  const server = new McpServer({ name: "novel-cv", version: "1.0.0" }, { instructions: [GUIDE, CONTENT_GUIDE].join("\n\n") });

  server.registerTool(
    "get_cv_master",
    {
      title: "Read the master CV",
      description:
        "Everything that can go on the CV, with ids: entries (by section) and their bullets with tags and weight (3 = strongest), allowed titles, stock headlines and summaries, skill groups, and the site's projects. Read this first.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      const [cv, projects] = await Promise.all([getCvContent(), getProjects()]);
      return json({
        guide: GUIDE,
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
        })),
        defaultVariant: "Leave any field out to use the default: entries with weight >= 2, their strongest bullets (4 per role, 5 for the lead one), skills first, then every section.",
      });
    },
  );

  server.registerTool(
    "preview_cv",
    {
      title: "Preview a CV variant",
      description: "Render a variant without saving it: the CV as text (with ids), its PDF page count, and any validation errors.",
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
        "Create a variant (omit code) or replace one (pass its code). Refuses invalid ids. Returns the code, the links to send (site, CV page, CV PDF, portfolio PDF) and the page count.",
      inputSchema: {
        label: z.string().trim().min(1).max(120).describe("Private note: who this is for."),
        variant: variantSchema,
        code: z.string().optional().describe("Existing code to replace; omit to create a new one."),
      },
    },
    async ({ label, variant, code }) => {
      const result = await preview(variant, origin);
      if (result.errors.length) return fail(`Not saved. Fix these first:\n${result.errors.join("\n")}`);
      try {
        const row = await saveVariant({ code, label, variant });
        return json({
          code: row.code,
          label: row.label,
          links: links(origin, row.code),
          pages: result.pages,
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
            links: links(origin, r.code),
          })),
        ),
      ),
  );

  server.registerTool(
    "get_cv_variant",
    {
      title: "Get a CV variant",
      description: "One saved variant by code, with its label, fields and activity.",
      inputSchema: { code: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ code }) => {
      const row = await getVariant(code);
      return row ? json({ ...row, activity: await getActivity(row.code), links: links(origin, row.code) }) : fail(`No variant with code "${code}".`);
    },
  );

  server.registerTool(
    "delete_cv_variant",
    {
      title: "Delete a CV variant",
      description: "Delete a variant. Its link falls back to the default site and CV.",
      inputSchema: { code: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ code }) => ((await deleteVariant(code)) ? json({ deleted: code }) : fail(`No variant with code "${code}".`)),
  );

  const doc = z.enum(["site", "cv", "projects"]).describe("site: the site's copy; cv: the master CV; projects: the case studies.");

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

  return server;
}

function authorize(request: Request): Response | null {
  const expected = process.env.CV_MCP_TOKEN;
  if (!expected) {
    // Locally the endpoint is open, so it can be tried before a token exists; never in production.
    return process.env.NODE_ENV === "production"
      ? Response.json({ error: "CV_MCP_TOKEN is not set." }, { status: 503 })
      : null;
  }
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return given === expected ? null : Response.json({ error: "Unauthorized." }, { status: 401 });
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

export { handle as GET, handle as POST, handle as DELETE };
