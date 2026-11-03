import { sessionCookie, signedIn, signIn } from "@/lib/dashboard/auth";

const noStore = { "Cache-Control": "no-store" };

/** Whether this browser is signed in (the sign-in form asks, in case a cross-site visit hid the cookie). */
export async function GET(request: Request) {
  return Response.json({ signedIn: signedIn(request) }, { headers: noStore });
}

/** Sign in with an authenticator code: `{ "code": "123456" }`. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code : "";
  const result = await signIn(code);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status, headers: noStore });
  return Response.json({ ok: true }, { headers: { ...noStore, "Set-Cookie": sessionCookie(request, result.token) } });
}

/** Sign out on this device. */
export async function DELETE(request: Request) {
  return Response.json({ ok: true }, { headers: { ...noStore, "Set-Cookie": sessionCookie(request, "", 0) } });
}
