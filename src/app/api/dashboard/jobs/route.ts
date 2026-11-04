import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { JobError, createJob, listJobs } from "@/lib/dashboard/jobs";

const noStore = { "Cache-Control": "no-store" };

/** Every job, newest first. The dashboard adds up each one's opens and clicks from the links it already has. */
export async function GET(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  return Response.json({ jobs: await listJobs() }, { headers: noStore });
}

/** A new job: `{ company, title, url?, status?, appliedOn?, links?, notes? }`. */
export async function POST(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request." }, { status: 400 });
  try {
    return Response.json(await createJob(body), { status: 201, headers: noStore });
  } catch (e) {
    if (e instanceof JobError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
