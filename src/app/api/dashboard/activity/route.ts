import { listEvents } from "@/lib/dashboard/activity";
import { signedIn, unauthorized } from "@/lib/dashboard/auth";

/** The feed: the most recent clicks, opens and downloads across every link, newest first. */
export async function GET(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  return Response.json({ events: await listEvents() }, { headers: { "Cache-Control": "no-store" } });
}
