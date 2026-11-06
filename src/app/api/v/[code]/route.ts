import { after } from "next/server";
import { fromTester, getVariant, recordActivity } from "@/lib/cv/store";
import type { PublicVariant } from "@/lib/cv/variant";
import { report } from "@/lib/dashboard/activity";
import { describeClick } from "@/lib/dashboard/visitor";

/**
 * A tailored version of the site and CV, by its code. Visitors' browsers call this once when they
 * open a `?v=` link; it returns the variant only, never the private label of who it was made for.
 * Each call counts as an open of that link, unless it comes from Novel's own browser, or it is the second
 * call of an open that moved to the link's language (`?moved=1`, see VariantLoader).
 */
export async function GET(request: Request, ctx: RouteContext<"/api/v/[code]">) {
  const { code } = await ctx.params;
  const row = await getVariant(code);
  if (!row) return Response.json({ error: "Not found." }, { status: 404 });
  if (!fromTester(request) && !new URL(request.url).searchParams.has("moved")) {
    // The referrer is this site's own page, which says nothing; where and on what device do.
    const { at, country, device } = describeClick(request);
    after(() =>
      Promise.all([recordActivity(row.code, "opens"), report({ kind: "open", ref: `cv:${row.code}`, name: row.label, at, country, device })]),
    );
  }
  const body: PublicVariant = { code: row.code, variant: row.variant };
  return Response.json(body, { headers: { "Cache-Control": "private, max-age=300" } });
}
