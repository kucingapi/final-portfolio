import { SetupError, sendSetupLink } from "@/lib/dashboard/setup";

const noStore = { "Cache-Control": "no-store" };

/** Email a one-time setup link (or a reset link, once sign-in exists). Anyone may ask; only Novel's inbox gets it. */
export async function POST(request: Request) {
  try {
    return Response.json({ ok: true, ...(await sendSetupLink(request.url)) }, { headers: noStore });
  } catch (error) {
    if (error instanceof SetupError) return Response.json({ error: error.message }, { status: error.status, headers: noStore });
    throw error;
  }
}
