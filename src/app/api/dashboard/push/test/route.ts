import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { send } from "@/lib/dashboard/push";

/** A test ping: `{ id }` for one device, or every device without it. */
export async function POST(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const body = await request.json().catch(() => null);
  const sent = await send(
    { title: "Notifications are on", body: "This is how a click or a CV download will show up.", url: "/dashboard", tag: "test" },
    typeof body?.id === "string" ? body.id : undefined,
  );
  return Response.json({ sent }, { headers: { "Cache-Control": "no-store" } });
}
