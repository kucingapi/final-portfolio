import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { deleteEnquiry } from "@/lib/dashboard/enquiries";

/** Delete one message for good (spam, or once it's dealt with). */
export async function DELETE(request: Request, ctx: RouteContext<"/api/dashboard/enquiries/[id]">) {
  if (!(await signedIn(request))) return unauthorized();
  const { id } = await ctx.params;
  if (!(await deleteEnquiry(id))) return Response.json({ error: "That message is already gone." }, { status: 404 });
  return Response.json({ ok: true });
}
