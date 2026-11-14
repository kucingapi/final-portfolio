import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { deleteChat, getChat } from "@/lib/dashboard/assistant";

const noStore = { "Cache-Control": "no-store" };

/** One saved chat with its messages. */
export async function GET(request: Request, ctx: RouteContext<"/api/dashboard/assistant/[id]">) {
  if (!(await signedIn(request))) return unauthorized();
  const chat = await getChat((await ctx.params).id);
  if (!chat) return Response.json({ error: "This chat is gone." }, { status: 404, headers: noStore });
  return Response.json(chat, { headers: noStore });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/dashboard/assistant/[id]">) {
  if (!(await signedIn(request))) return unauthorized();
  if (!(await deleteChat((await ctx.params).id))) return Response.json({ error: "That chat is already gone." }, { status: 404 });
  return Response.json({ ok: true });
}
