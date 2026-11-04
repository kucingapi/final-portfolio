"use client";

import { send } from "./api";

/**
 * What this browser can do: install the dashboard, receive pushes, share a link. The service worker is
 * public/dashboard-sw.js, scoped to /dashboard.
 */

const SW = "/dashboard-sw.js";
const SCOPE = "/dashboard";

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** "install": an iPhone in Safari, which only lets home-screen apps receive pushes. */
export type PushSupport = "ok" | "install" | "unsupported";

export function pushSupport(): PushSupport {
  if (isIOS() && !isStandalone()) return "install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return "ok";
}

export const registerWorker = () => navigator.serviceWorker.register(SW, { scope: SCOPE, updateViaCache: "none" });

export async function currentSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(SCOPE);
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/** The server's id for a device: the first 16 hex of the SHA-256 of its push endpoint. */
export async function deviceId(endpoint: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

function keyBytes(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/** Ask for permission (first, while the tap still counts as a gesture), then subscribe and tell the server. */
export async function turnOn(publicKey: string) {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notifications are blocked for this site. Allow them in the browser's or phone's settings, then try again."
        : "Notifications weren't allowed. Try again and choose Allow.",
    );
  }
  await registerWorker();
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  return send<{ id: string }>("/api/dashboard/push", "POST", { subscription: subscription.toJSON() });
}

export async function turnOff(id: string) {
  const subscription = await currentSubscription();
  if (subscription && (await deviceId(subscription.endpoint)) === id) await subscription.unsubscribe();
  await send("/api/dashboard/push", "DELETE", { id });
}

// --- Install ------------------------------------------------------------------------------------------

/** Chrome and Edge offer their install prompt once; it's kept here for the Install button to show. */
type InstallPrompt = Event & { prompt(): Promise<void> };
let deferred: InstallPrompt | null = null;
const INSTALLABLE = "dash:installable";

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallPrompt;
    window.dispatchEvent(new Event(INSTALLABLE));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    window.dispatchEvent(new Event(INSTALLABLE));
  });
}

export const canInstall = () => deferred !== null;

export function onInstallable(cb: () => void) {
  window.addEventListener(INSTALLABLE, cb);
  return () => window.removeEventListener(INSTALLABLE, cb);
}

export async function installApp() {
  const prompt = deferred;
  if (!prompt) return;
  await prompt.prompt();
  deferred = null;
  window.dispatchEvent(new Event(INSTALLABLE));
}

export function onDisplayMode(cb: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", cb);
  return () => query.removeEventListener("change", cb);
}

// --- Share --------------------------------------------------------------------------------------------

/** The share sheet on phones; false where there is none (then the caller copies instead). */
export async function share(url: string, title: string) {
  if (!navigator.share) return false;
  try {
    await navigator.share({ url, title });
  } catch {}
  return true;
}

export const canShare = () => typeof navigator !== "undefined" && "share" in navigator;
