import { createHash } from "node:crypto";
import webpush, { type PushSubscription } from "web-push";
import { site } from "@/content/site";
import { getValue, setValue } from "./state";

/**
 * Push notifications to the devices Novel turned them on for (Web Push with VAPID: Chrome, Firefox,
 * Safari, and iPhone once the dashboard is on the home screen). The VAPID keys are made on first use and
 * kept in the store, so there is nothing to configure. Server only.
 */

export type Device = { id: string; name: string; createdAt: string; subscription: PushSubscription };
export type Prefs = { enquiries: boolean; clicks: boolean; opens: boolean; downloads: boolean };
export type Ping = { title: string; body: string; url: string; tag: string };

const KEYS = "dash:push:vapid";
const DEVICES = "dash:push:devices";
const PREFS = "dash:push:prefs";
const DEFAULT_PREFS: Prefs = { enquiries: true, clicks: true, opens: true, downloads: true };

type Vapid = { publicKey: string; privateKey: string };

async function vapid(): Promise<Vapid> {
  const saved = await getValue<Vapid>(KEYS);
  if (saved) return saved;
  const keys = webpush.generateVAPIDKeys();
  // Two first requests at once: whichever saved first wins, and both use its keys.
  if (await setValue(KEYS, keys, { nx: true })) return keys;
  return (await getValue<Vapid>(KEYS))!;
}

export const publicKey = async () => (await vapid()).publicKey;

export const deviceId = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex").slice(0, 16);

export async function listDevices(): Promise<Device[]> {
  return Object.values((await getValue<Record<string, Device>>(DEVICES)) ?? {});
}

async function saveDevices(update: (all: Record<string, Device>) => void) {
  const all = (await getValue<Record<string, Device>>(DEVICES)) ?? {};
  update(all);
  await setValue(DEVICES, all);
}

export function isSubscription(value: unknown): value is PushSubscription {
  const s = value as PushSubscription | null;
  return Boolean(s && typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) && s.keys?.p256dh && s.keys?.auth);
}

export async function addDevice(subscription: PushSubscription, name: string) {
  const id = deviceId(subscription.endpoint);
  await saveDevices((all) => {
    all[id] = { id, name, createdAt: all[id]?.createdAt ?? new Date().toISOString(), subscription };
  });
  return id;
}

export async function removeDevice(id: string) {
  await saveDevices((all) => {
    delete all[id];
  });
}

export async function getPrefs(): Promise<Prefs> {
  return { ...DEFAULT_PREFS, ...(await getValue<Partial<Prefs>>(PREFS)) };
}

export async function setPrefs(prefs: Partial<Prefs>) {
  const next = { ...(await getPrefs()) };
  for (const k of Object.keys(DEFAULT_PREFS) as (keyof Prefs)[]) if (typeof prefs[k] === "boolean") next[k] = prefs[k];
  await setValue(PREFS, next);
  return next;
}

/** Send to every device, or to one. Devices whose browser dropped the subscription are forgotten. */
export async function send(ping: Ping, only?: string) {
  const devices = (await listDevices()).filter((d) => !only || d.id === only);
  if (!devices.length) return 0;
  const { publicKey, privateKey } = await vapid();
  const options = { vapidDetails: { subject: `mailto:${site.email}`, publicKey, privateKey }, TTL: 24 * 3600, urgency: "normal" as const };
  const results = await Promise.all(
    devices.map(async (d) => {
      try {
        await webpush.sendNotification(d.subscription, JSON.stringify(ping), options);
        return true;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await removeDevice(d.id);
        else console.error(`[dashboard] push to ${d.name} failed`, status ?? error);
        return false;
      }
    }),
  );
  return results.filter(Boolean).length;
}
