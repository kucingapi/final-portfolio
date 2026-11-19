import { getVariant } from "@/lib/cv/store";
import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { readWatch } from "@/lib/proposal/posthog-read";
import { videosOf } from "@/lib/proposal/proposal";

const noStore = { "Cache-Control": "no-store" };

/** How a tailored link's proposal was watched, per viewing and video, read from PostHog as the sheet opens. */
export async function GET(request: Request, ctx: RouteContext<"/api/dashboard/proposal/[code]">) {
  if (!(await signedIn(request))) return unauthorized();
  const { code } = await ctx.params;
  const row = await getVariant(code);
  if (!row?.variant.proposal) return Response.json({ error: "This link has no proposal." }, { status: 404, headers: noStore });
  return Response.json(await readWatch(row.code, videosOf(row.variant.proposal).length), { headers: noStore });
}
