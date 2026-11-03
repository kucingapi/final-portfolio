import { renderPortfolioPdf } from "@/lib/portfolio/pdf";
import { after } from "next/server";
import { fromTester, getVariant, recordActivity } from "@/lib/cv/store";
import { resolveCv } from "@/lib/cv/variant";
import { reportDownload } from "@/lib/dashboard/visitor";
import { projects } from "@/content/projects";

/**
 * The portfolio as a PDF deck: three projects, the first three in the variant's order. `?v=<code>`
 * tailors it (an unknown code falls back to the default); `?download=1` saves it instead of opening it.
 * `?project=<slug>` gives that one project's slides alone, with no site address or links, for Upwork.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("v");
  const row = code ? await getVariant(code) : null;
  if (row && !fromTester(request)) after(() => Promise.all([recordActivity(row.code, "portfolio"), reportDownload(request, row, "portfolio")]));
  const slug = url.searchParams.get("project");
  const project = slug && projects.some((p) => p.slug === slug) ? slug : undefined;
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || url.origin;
  const { pdf, pages, expected } = await renderPortfolioPdf({
    cv: resolveCv(row?.variant, row?.code),
    variant: row?.variant,
    origin,
    code: row?.code,
    // In development, `?count=11` lays out every project, to check that no slide overflows.
    count: process.env.NODE_ENV === "development" ? Number(url.searchParams.get("count")) || 3 : 3,
    project,
  });
  if (pages !== expected) console.warn(`Portfolio PDF ran to ${pages} pages, expected ${expected}: a slide overflowed.`);
  const disposition = url.searchParams.get("download") ? "attachment" : "inline";
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="Novel-Bafagih-${project ?? "Portfolio"}.pdf"`,
      "X-Portfolio-Pages": String(pages),
      "Cache-Control": "private, max-age=300",
    },
  });
}
