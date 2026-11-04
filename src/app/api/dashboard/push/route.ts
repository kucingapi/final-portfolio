import { userAgent } from "next/server";
import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { addDevice, getPrefs, isSubscription, listDevices, publicKey, removeDevice, setPrefs } from "@/lib/dashboard/push";

const noStore = { "Cache-Control": "no-store" };

/** The key a browser subscribes with, which kinds of event ping, and the devices that get them. */
export async function GET(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const [key, prefs, devices] = await Promise.all([publicKey(), getPrefs(), listDevices()]);
  return Response.json(
    { publicKey: key, prefs, devices: devices.map(({ id, name, createdAt }) => ({ id, name, createdAt })) },
    { headers: noStore },
  );
}

/** Turn notifications on for this device: `{ subscription }`, as PushManager.subscribe() made it. */
export async function POST(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!isSubscription(body?.subscription)) return Response.json({ error: "That isn't a push subscription." }, { status: 400, headers: noStore });
  const ua = userAgent(request);
  const name = [ua.device.model || ua.os.name, ua.browser.name].filter(Boolean).join(" · ") || "Browser";
  const id = await addDevice(body.subscription, name);
  return Response.json({ id }, { status: 201, headers: noStore });
}

/** Which kinds of event ping: `{ clicks?, opens?, downloads? }`. */
export async function PATCH(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const body = await request.json().catch(() => null);
  return Response.json({ prefs: await setPrefs(body ?? {}) }, { headers: noStore });
}

/** Stop pinging a device: `{ id }`. */
export async function DELETE(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string") return Response.json({ error: "Which device?" }, { status: 400, headers: noStore });
  await removeDevice(body.id);
  return Response.json({ ok: true }, { headers: noStore });
}
