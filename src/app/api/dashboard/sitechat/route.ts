import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { assistantReady } from "@/lib/dashboard/assistant";
import { LIMITS, getSiteChatConfig, listSiteChats, setSiteChatConfig, usedToday } from "@/lib/dashboard/sitechat";

const noStore = { "Cache-Control": "no-store" };

/** The site chat's switch and model, today's use against the cap, and the latest conversations. */
export async function GET(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const [config, today, chats] = await Promise.all([getSiteChatConfig(), usedToday(), listSiteChats()]);
  return Response.json({ config, ready: assistantReady(), today, cap: LIMITS.siteDay, chats }, { headers: noStore });
}

/** Change the switch or the model: `{ enabled?, model? }`. */
export async function POST(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request." }, { status: 400 });
  return Response.json({ config: await setSiteChatConfig(body) }, { headers: noStore });
}
