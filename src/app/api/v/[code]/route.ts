import { getVariant } from "@/lib/cv/store";
import type { PublicVariant } from "@/lib/cv/variant";

/**
 * A tailored version of the site and CV, by its code. Visitors' browsers call this once when they
 * open a `?v=` link; it returns the variant only, never the private label of who it was made for.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/v/[code]">) {
  const { code } = await ctx.params;
  const row = await getVariant(code);
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  const body: PublicVariant = { code: row.code, variant: row.variant };
  return Response.json(body, { headers: { "Cache-Control": "private, max-age=300" } });
}
