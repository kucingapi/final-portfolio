import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { forget } from "@/lib/dashboard/activity";
import { deleteSiteChat, getSiteChat } from "@/lib/dashboard/sitechat";

const noStore = { "Cache-Control": "no-store" };

/** One visitor's conversation with AI Novel. */
export async function GET(request: Request, ctx: RouteContext<"/api/dashboard/sitechat/[id]">) {
  if (!(await signedIn(request))) return unauthorized();
  const chat = await getSiteChat((await ctx.params).id);
  if (!chat) return Response.json({ error: "This chat is gone." }, { status: 404, headers: noStore });
  return Response.json(chat, { headers: noStore });
}

/** Delete it for good, and its entry in the activity feed. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/dashboard/sitechat/[id]">) {
  if (!(await signedIn(request))) return unauthorized();
  const { id } = await ctx.params;
  if (!(await deleteSiteChat(id))) return Response.json({ error: "That chat is already gone." }, { status: 404 });
  await forget(`sitechat:${id}`);
  return Response.json({ ok: true });
}
