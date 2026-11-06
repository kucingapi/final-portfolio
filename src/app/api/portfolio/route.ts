import { renderPortfolioPdf } from "@/lib/portfolio/pdf";
import { after } from "next/server";
import { pdfLimited } from "@/lib/rate";
import { fromTester, getVariant, recordActivity } from "@/lib/cv/store";
import { cvIn, requestedLang } from "@/lib/cv/localized";
import { reportDownload } from "@/lib/dashboard/visitor";
import { getProjects } from "@/lib/content/read";

/**
 * The portfolio as a PDF deck: three projects, the first three in the variant's order. `?v=<code>`
 * tailors it (an unknown code falls back to the default); `?download=1` saves it instead of opening it.
 * `?project=<slug>` gives that one project's slides alone, with no site address or links, for Upwork.
 * `?lang=id` gives it in Bahasa Indonesia; by default it is in the variant's language.
 */
export async function GET(request: Request) {
  const limited = await pdfLimited(request);
  if (limited) return limited;
  const url = new URL(request.url);
  const code = url.searchParams.get("v");
  const row = code ? await getVariant(code) : null;
  if (row && !fromTester(request)) after(() => Promise.all([recordActivity(row.code, "portfolio"), reportDownload(request, row, "portfolio")]));
  const slug = url.searchParams.get("project");
  const project = slug && (await getProjects()).some((p) => p.slug === slug) ? slug : undefined;
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || url.origin;
  const { pdf, pages, expected } = await renderPortfolioPdf({
    cv: await cvIn(requestedLang(url.searchParams.get("lang"), row?.variant), row?.variant, row?.code),
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
