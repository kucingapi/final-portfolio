import { renderCvPdf } from "@/lib/cv/pdf";
import { after } from "next/server";
import { pdfLimited } from "@/lib/rate";
import { fromTester, getVariant, recordActivity } from "@/lib/cv/store";
import { getCvContent } from "@/lib/content/read";
import { masterCv, resolveCv } from "@/lib/cv/variant";
import { reportDownload } from "@/lib/dashboard/visitor";

/**
 * The CV as a PDF. `?v=<code>` tailors it to that variant (an unknown code falls back to the
 * default); `?download=1` saves it instead of opening it. In development, `?all=1` prints the whole
 * master CV, every line and alternative, for proofreading.
 */
export async function GET(request: Request) {
  const limited = await pdfLimited(request);
  if (limited) return limited;
  const url = new URL(request.url);
  const params = url.searchParams;
  const code = params.get("v");
  const row = code ? await getVariant(code) : null;
  if (row && !fromTester(request)) after(() => Promise.all([recordActivity(row.code, "cv"), reportDownload(request, row, "cv")]));
  const all = process.env.NODE_ENV === "development" && params.get("all");
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || url.origin;
  const content = await getCvContent();
  const { pdf, pages } = await renderCvPdf(all ? masterCv(content) : resolveCv(content, row?.variant, row?.code), origin);
  const disposition = params.get("download") ? "attachment" : "inline";
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="Novel-Bafagih-CV.pdf"`,
      "X-CV-Pages": String(pages),
      "Cache-Control": "private, max-age=300",
    },
  });
}
