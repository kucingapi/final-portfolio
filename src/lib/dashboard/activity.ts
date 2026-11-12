import type { Device } from "./links";
import { getPrefs, send, type Ping, type Prefs } from "./push";
import { pushToList, readList, removeFromList, setValue } from "./state";

/**
 * What happened on the site, newest first: short-link clicks, tailored CV links opened, their CV and
 * portfolio PDFs downloaded, and messages sent through the contact form. Each event goes to the
 * dashboard's feed and, when that kind is switched on, to the phone as a notification. Callers have
 * already left out link previews and Novel's own browser (`nb_test`). Server only.
 */

export type ActivityKind = "click" | "open" | "cv" | "portfolio" | "rates" | "rateViews" | "enquiry";

export type ActivityEvent = {
  at: string;
  kind: ActivityKind;
  /** What it happened to: "go:<name>", "cv:<code>", or "enquiry:<id>" for a message. */
  ref: string;
  /** The short link's name, who the tailored link is for (private), or who sent the message. */
  name: string;
  /** A message's service and first words. */
  detail?: string;
  country?: string;
  device?: Device;
  referrer?: string;
};

const FEED = "dash:events";
export const FEED_SIZE = 300;
/** One ping per link a minute: a burst of clicks is one notification, and the feed has every one. */
const QUIET_SECONDS = 60;

const PREF: Record<ActivityKind, keyof Prefs> = { click: "clicks", open: "opens", cv: "downloads", portfolio: "downloads", rates: "downloads", rateViews: "opens", enquiry: "enquiries" };
const TITLE: Record<ActivityKind, string> = {
  enquiry: "New message",
  click: "Short link opened",
  open: "CV link opened",
  cv: "CV downloaded",
  portfolio: "Portfolio downloaded",
  rates: "Rate card downloaded",
  rateViews: "Rate card viewed",
};

export const listEvents = (count = FEED_SIZE) => readList<ActivityEvent>(FEED, count);

/** Take every event about one thing (a deleted message) out of the feed. */
export async function forget(ref: string) {
  for (const e of (await listEvents()).filter((e) => e.ref === ref)) await removeFromList(FEED, e);
}

/** Record an event and ping the phone. Run it inside `after()`, so the visitor never waits for it. */
export async function report(event: ActivityEvent) {
  const results = await Promise.allSettled([pushToList(FEED, event, FEED_SIZE), ping(event)]);
  for (const r of results) if (r.status === "rejected") console.error("[dashboard] activity", r.reason);
}

async function ping(event: ActivityEvent) {
  if (!(await getPrefs())[PREF[event.kind]]) return;
  if (!(await setValue(`dash:push:quiet:${event.ref}`, 1, { ex: QUIET_SECONDS, nx: true }))) return;
  await send(describe(event));
}

export function describe(e: ActivityEvent): Ping {
  if (e.kind === "enquiry") {
    const id = e.ref.slice("enquiry:".length);
    return { title: `New message from ${e.name}`, body: e.detail ?? "", url: `/dashboard?view=inbox&enquiry=${id}`, tag: e.ref };
  }
  const what = e.kind === "click" ? `/go/${e.name}` : e.name;
  const where = [e.country && countryName(e.country), e.device, e.referrer && `from ${e.referrer}`].filter(Boolean);
  return {
    title: TITLE[e.kind],
    body: [what, ...where].join(" · "),
    url: `/dashboard?link=${encodeURIComponent(e.ref)}`,
    tag: e.ref,
  };
}

export function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
