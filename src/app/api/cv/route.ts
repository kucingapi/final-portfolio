import { renderCvPdf } from "@/lib/cv/pdf";
import { after } from "next/server";
import { pdfLimited } from "@/lib/rate";
import { fromTester, getVariant, recordActivity } from "@/lib/cv/store";
import { cvPdfIn, masterCvIn, requestedLang } from "@/lib/cv/localized";
import { reportDownload } from "@/lib/dashboard/visitor";

/**
 * The CV as a PDF. `?v=<code>` tailors it to that variant (an unknown code falls back to the
 * default); `?lang=id` gives it in Bahasa Indonesia (by default it is in the variant's language);
 * `?download=1` saves it instead of opening it. In development, `?all=1` prints the whole master CV,
 * every line and alternative, for proofreading.
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
  const lang = requestedLang(params.get("lang"), row?.variant);
  const { pdf, pages } = all ? await renderCvPdf(await masterCvIn(lang), origin) : await cvPdfIn(lang, row?.variant, row?.code, origin);
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
