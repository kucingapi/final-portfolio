import { sessionCookie } from "@/lib/dashboard/auth";
import { finishSetup, revealSetup, SetupError } from "@/lib/dashboard/setup";

const noStore = { "Cache-Control": "no-store" };

/**
 * The setup page's two steps, both behind the emailed token: `{ token }` shows the new secret (the same
 * one each time), and `{ token, code }` confirms it with the app's first code, then signs this browser in.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  try {
    if (typeof body?.code !== "string") return Response.json(await revealSetup(token), { headers: noStore });
    const result = await finishSetup(token, body.code);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status, headers: noStore });
    return Response.json({ ok: true }, { headers: { ...noStore, "Set-Cookie": sessionCookie(request, result.token) } });
  } catch (error) {
    if (error instanceof SetupError) return Response.json({ error: error.message }, { status: error.status, headers: noStore });
    throw error;
  }
}
