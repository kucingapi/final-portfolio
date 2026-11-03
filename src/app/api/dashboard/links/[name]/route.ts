import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { deleteLink, getClicks, getLink, getStats, updateLink } from "@/lib/dashboard/links";

const noStore = { "Cache-Control": "no-store" };
const notFound = () => Response.json({ error: "No such link." }, { status: 404, headers: noStore });

/** One link with its stats and its most recent clicks. */
export async function GET(request: Request, ctx: RouteContext<"/api/dashboard/links/[name]">) {
  if (!(await signedIn(request))) return unauthorized();
  const { name } = await ctx.params;
  const link = await getLink(name);
  if (!link) return notFound();
  const [stats, clicks] = await Promise.all([getStats([name]), getClicks(name)]);
  return Response.json({ ...link, stats: stats[name], clicks }, { headers: noStore });
}

/** Change the destination or the note: `{ url?, note? }`. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/dashboard/links/[name]">) {
  if (!(await signedIn(request))) return unauthorized();
  const { name } = await ctx.params;
  if (!(await getLink(name))) return notFound();
  const body = await request.json().catch(() => null);
  try {
    const link = await updateLink(name, {
      url: typeof body?.url === "string" ? body.url : undefined,
      note: typeof body?.note === "string" ? body.note : undefined,
    });
    return Response.json(link, { headers: noStore });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400, headers: noStore });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/dashboard/links/[name]">) {
  if (!(await signedIn(request))) return unauthorized();
  const { name } = await ctx.params;
  return (await deleteLink(name)) ? Response.json({ ok: true }, { headers: noStore }) : notFound();
}
