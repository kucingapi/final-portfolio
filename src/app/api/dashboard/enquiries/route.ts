import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { lastSeen, listEnquiries, markSeen } from "@/lib/dashboard/enquiries";

/** The Inbox: contact-form messages, newest first, and when the Inbox was last opened. */
export async function GET(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const [enquiries, seen] = await Promise.all([listEnquiries(), lastSeen()]);
  return Response.json({ enquiries, seen }, { headers: { "Cache-Control": "no-store" } });
}

/** `{ "seen": true }`: the Inbox was opened, so what's in it now is read. */
export async function POST(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { seen?: boolean };
  if (body.seen !== true) return Response.json({ error: "Nothing to do." }, { status: 400 });
  await markSeen();
  return Response.json({ ok: true });
}
