import { after } from "next/server";
import { pdfLimited } from "@/lib/rate";
import { fromTester, getVariant, recordActivity } from "@/lib/cv/store";
import { cvIn, rateCardIn, requestedLang } from "@/lib/cv/localized";
import { renderRateCardPdf } from "@/lib/cv/rate-card-pdf";
import { reportDownload } from "@/lib/dashboard/visitor";

/**
 * A variant's rate card as a one-page PDF. `?v=<code>` is required: there is no default rate card, and a
 * variant without `rates` has none (404). `?lang=` and `?download=1` work as on /api/cv.
 */
export async function GET(request: Request) {
  const limited = await pdfLimited(request);
  if (limited) return limited;
  const params = new URL(request.url).searchParams;
  const code = params.get("v");
  const row = code ? await getVariant(code) : null;
  if (!row?.variant.rates) return new Response("Not found", { status: 404 });
  const lang = requestedLang(params.get("lang"), row.variant);
  const [cv, card] = await Promise.all([cvIn(lang, row.variant, row.code), rateCardIn(lang, row.variant)]);
  if (!card) return new Response("Not found", { status: 404 });
  if (!fromTester(request)) after(() => Promise.all([recordActivity(row.code, "rates"), reportDownload(request, row, "rates")]));
  const pdf = await renderRateCardPdf(cv, card);
  const disposition = params.get("download") ? "attachment" : "inline";
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="Novel-Bafagih-Rate-Card.pdf"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
