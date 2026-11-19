import { gunzipSync } from "node:zlib";
import type { APIRequestContext, Page, Request } from "@playwright/test";
import { base32Decode, codeAt, stepAt } from "../src/lib/dashboard/totp";

/** One MCP tool call, the way Novel's agent makes it (stateless JSON-RPC over HTTP). */
export async function mcp<T = unknown>(request: APIRequestContext, name: string, args: Record<string, unknown>): Promise<{ ok: boolean; data: T; text: string }> {
  const res = await request.post("/api/mcp", {
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    data: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } },
  });
  const body = await res.json();
  if (body.error) throw new Error(`MCP ${name}: ${JSON.stringify(body.error)}`);
  const text: string = body.result.content[0].text;
  const ok = !body.result.isError;
  return { ok, text, data: (ok ? JSON.parse(text) : undefined) as T };
}

let session: string | undefined;

/**
 * A dashboard session for this run, signed in once with an authenticator code: a used code (or an
 * earlier one) can't sign in again, so every test shares the one session. Returns the cookie's value.
 */
export async function dashboardSession(request: APIRequestContext): Promise<string> {
  if (session) return session;
  const secret = base32Decode("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
  for (const step of [stepAt(), stepAt() + 1]) {
    const res = await request.post("/api/dashboard/session", { data: { code: codeAt(secret, step) } });
    const cookie = /nb_dash=([^;]+)/.exec(res.headers()["set-cookie"] ?? "")?.[1];
    if (res.ok() && cookie) return (session = cookie);
  }
  throw new Error("Couldn't sign in to the dashboard (this window's codes were used by a run moments ago; wait 30 s).");
}

/** GET a dashboard API as Novel. */
export async function dashboardGet<T = unknown>(request: APIRequestContext, url: string): Promise<T> {
  const res = await request.get(url, { headers: { Cookie: `nb_dash=${await dashboardSession(request)}` } });
  if (!res.ok()) throw new Error(`${url}: ${res.status()}`);
  return res.json();
}

/**
 * Stands in for YouTube's IFrame Player API: each player is a plain box whose clock follows the page's
 * (fake) time while playing. Tests drive it through `window.__yt[i]`: play(), pause(), seek(s), end().
 */
const FAKE_YT = `
window.__yt = [];
class Player {
  constructor(el, o) {
    this.o = o; this.t = 0; this.state = -1; this.since = Date.now(); this.dur = o.videoId === "9bZkp7q19f0" ? 90 : 60;
    const box = document.createElement("div");
    box.dataset.fakeYt = o.videoId;
    box.textContent = "fake player " + o.videoId;
    el.replaceWith(box);
    window.__yt.push(this);
    // Like YouTube's, its methods work only once it is ready (a moment after it is made).
    this.ready = false;
    setTimeout(() => { this.ready = true; o.events.onReady && o.events.onReady({ target: this }); }, 50);
  }
  check() { if (!this.ready) throw new TypeError("player not ready"); }
  getCurrentTime() { this.check(); return this.state === 1 ? Math.min(this.dur, this.t + (Date.now() - this.since) / 1000) : this.t; }
  getDuration() { return this.dur; }
  getPlayerState() { this.check(); return this.state; }
  set(s) { this.t = this.getCurrentTime(); this.state = s; this.since = Date.now(); this.o.events.onStateChange({ data: s, target: this }); }
  play() { this.set(1); }
  playVideo() { this.play(); }
  pause() { this.set(2); }
  pauseVideo() { this.pause(); }
  seek(s) { this.t = s; this.since = Date.now(); }
  end() { this.t = this.dur; this.state = 0; this.o.events.onStateChange({ data: 0, target: this }); }
  destroy() {}
}
window.YT = { Player };
window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady();
`;

export async function fakeYouTube(page: Page) {
  await page.route("https://www.youtube.com/iframe_api", (route) => route.fulfill({ contentType: "text/javascript", body: FAKE_YT }));
}

export type Captured = { event: string; properties: Record<string, unknown> };

function decode(req: Request): Captured[] {
  const buf = req.postDataBuffer();
  if (!buf?.length) return [];
  let text: string;
  try {
    text = gunzipSync(buf).toString("utf8");
  } catch {
    text = buf.toString("utf8");
    if (text.startsWith("data=")) text = Buffer.from(decodeURIComponent(text.slice(5)), "base64").toString("utf8");
  }
  try {
    const json = JSON.parse(text);
    const list = Array.isArray(json) ? json : (json.batch ?? [json]);
    return list.filter((e: Captured) => e && typeof e.event === "string");
  } catch {
    return [];
  }
}

/** Everything the page sends to PostHog (through /relay), answered locally so nothing leaves the machine. */
export async function capturePostHog(page: Page): Promise<Captured[]> {
  const events: Captured[] = [];
  // posthog-js drops events from automated browsers; this one should look like a visitor's.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => undefined });
  });
  await page.route(/\/relay\//i, async (route) => {
    const req = route.request();
    if (req.method() === "POST") events.push(...decode(req));
    const js = /\.js(\?|$)/.test(req.url());
    await route.fulfill(js ? { contentType: "text/javascript", body: "" } : { contentType: "application/json", body: JSON.stringify({ status: 1 }) });
  });
  return events;
}

/** The page's view of being hidden (tab switched, app left), as the browser would report it. */
export async function hidePage(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}
