import { after } from "next/server";
import { fromTester } from "@/lib/cv/store";
import { report } from "@/lib/dashboard/activity";
import { getLink, recordClick } from "@/lib/dashboard/links";
import { describeClick, isPreview } from "@/lib/dashboard/visitor";

/**
 * A short link: `/go/<name>` sends the visitor on with a 302, so browsers don't cache it and a changed
 * destination works at once. People's clicks are counted (and reach the dashboard's feed and Novel's
 * phone); link previews and his own browser (the `nb_test` cookie) are redirected without being
 * counted. An unknown name lands on the home page.
 */
export async function GET(request: Request, ctx: RouteContext<"/go/[name]">) {
  const { name } = await ctx.params;
  const link = await getLink(name.toLowerCase());
  const target = new URL(link?.url ?? "/", request.url);
  if (link && !isPreview(request) && !fromTester(request)) {
    const click = describeClick(request);
    after(() => Promise.all([recordClick(link.name, click), report({ kind: "click", ref: `go:${link.name}`, name: link.name, ...click })]));
  }
  return new Response(null, {
    status: 302,
    headers: { Location: target.toString(), "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

/** Some unfurlers send HEAD first; answer it the same way, without counting. */
export const HEAD = GET;
