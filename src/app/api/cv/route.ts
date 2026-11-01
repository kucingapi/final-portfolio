import { renderCvPdf } from "@/lib/cv/pdf";
import { getVariant } from "@/lib/cv/store";
import { resolveCv } from "@/lib/cv/variant";

/**
 * The CV as a PDF. `?v=<code>` tailors it to that variant (an unknown code falls back to the
 * default); `?download=1` saves it instead of opening it.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("v");
  const row = code ? await getVariant(code) : null;
  const { pdf, pages } = await renderCvPdf(resolveCv(row?.variant));
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
