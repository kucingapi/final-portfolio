import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { CV_SECTIONS, CV_TAGS, cvEntries, cvHeader, cvSkills, cvSummaries } from "@/content/cv";
import { projects } from "@/content/projects";
import { renderCvPdf } from "@/lib/cv/pdf";
import { deleteVariant, getVariant, listVariants, saveVariant, type StoredVariant } from "@/lib/cv/store";
import { variantSchema } from "@/lib/cv/schema";
import { checkVariant, cvToText, resolveCv, type Variant } from "@/lib/cv/variant";

/**
 * MCP server for tailoring the CV and the site to one application. An agent reads the master CV,
 * previews a variant (text plus PDF page count), saves it, and gets back a link with an opaque code
 * (`/?v=k7qx2pmd`) that is all a recruiter ever sees. Stateless Streamable HTTP; every request needs
 * `Authorization: Bearer $CV_MCP_TOKEN`.
 */

const GUIDE = `How to tailor:
- Read the job description, then pick what proves fit. Lead with impact: results and numbers first.
- The CV must be exactly 2 pages: preview_cv reports the page count; trim bullets or entries until it is 2.
- Only pick, order and choose between existing lines (entry ids, bullet ids, allowed titles, skill group ids). Never invent facts; free text is limited to "headline" and "summary", and those must stay true to the master CV.
- "projects" orders the site's projects page for this visitor (lead with the most relevant); "mode" sets which way the site opens (fulltime for employers, freelance for clients).
- The label is private (e.g. "Acme, Senior Frontend, 2026-11"); the visitor never sees it.`;

const slugs = projects.map((p) => p.slug);
const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });

function links(origin: string, code: string) {
  return {
    site: `${origin}/?v=${code}`,
    cv: `${origin}/cv?v=${code}`,
    pdf: `${origin}/api/cv?v=${code}&download=1`,
  };
}

async function preview(variant: Variant) {
  const errors = checkVariant(variant, slugs);
  const cv = resolveCv(variant);
  const { pages } = await renderCvPdf(cv);
  return { errors, pages, fitsTwoPages: pages === 2, text: cvToText(cv) };
}

function buildServer(origin: string) {
  const server = new McpServer({ name: "novel-cv", version: "1.0.0" }, { instructions: GUIDE });

  server.registerTool(
    "get_cv_master",
    {
      title: "Read the master CV",
      description:
        "Everything that can go on the CV, with ids: entries (by section) and their bullets with tags and weight (3 = strongest), allowed titles, stock headlines and summaries, skill groups, and the site's projects. Read this first.",
      annotations: { readOnlyHint: true },
    },
    async () =>
      json({
        guide: GUIDE,
        sections: CV_SECTIONS,
        tags: CV_TAGS,
        headlines: cvHeader.headlines,
        summaries: cvSummaries,
        entries: cvEntries,
        skills: cvSkills,
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
        defaultVariant: "Leave any field out to use the default: entries with weight >= 2, their strongest bullets, all sections and skills.",
      }),
  );

  server.registerTool(
    "preview_cv",
    {
      title: "Preview a CV variant",
      description: "Render a variant without saving it: the CV as text (with ids), its PDF page count, and any validation errors.",
      inputSchema: { variant: variantSchema },
      annotations: { readOnlyHint: true },
    },
    async ({ variant }) => json(await preview(variant)),
  );

  server.registerTool(
    "save_cv_variant",
    {
      title: "Save a CV variant",
      description:
        "Create a variant (omit code) or replace one (pass its code). Refuses invalid ids. Returns the code, the links to send (site, CV page, PDF) and the page count.",
      inputSchema: {
        label: z.string().trim().min(1).max(120).describe("Private note: who this is for."),
        variant: variantSchema,
        code: z.string().optional().describe("Existing code to replace; omit to create a new one."),
      },
    },
    async ({ label, variant, code }) => {
      const result = await preview(variant);
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
      description: "Every saved variant, newest first, with its private label and links.",
      annotations: { readOnlyHint: true },
    },
    async () =>
      json(
        (await listVariants()).map((r: StoredVariant) => ({
          code: r.code,
          label: r.label,
          updatedAt: r.updatedAt,
          links: links(origin, r.code),
        })),
      ),
  );

  server.registerTool(
    "get_cv_variant",
    {
      title: "Get a CV variant",
      description: "One saved variant by code, with its label and fields.",
      inputSchema: { code: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ code }) => {
      const row = await getVariant(code);
      return row ? json({ ...row, links: links(origin, row.code) }) : fail(`No variant with code "${code}".`);
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
