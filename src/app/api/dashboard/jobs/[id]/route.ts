import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { JobError, deleteJob, updateJob } from "@/lib/dashboard/jobs";

/** Change a job: any of `{ company, title, url, status, appliedOn, links, notes }`. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/dashboard/jobs/[id]">) {
  if (!(await signedIn(request))) return unauthorized();
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request." }, { status: 400 });
  try {
    return Response.json(await updateJob(id, body));
  } catch (e) {
    if (e instanceof JobError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

/** Forget a job. The links sent with it stay. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/dashboard/jobs/[id]">) {
  if (!(await signedIn(request))) return unauthorized();
  const { id } = await ctx.params;
  if (!(await deleteJob(id))) return Response.json({ error: "That job is already gone." }, { status: 404 });
  return Response.json({ ok: true });
}
