import type { Device } from "./links";
import { getPrefs, send, type Ping, type Prefs } from "./push";
import { pushToList, readList, setValue } from "./state";

/**
 * What happened to Novel's links, newest first: short-link clicks, tailored CV links opened, and their
 * CV and portfolio PDFs downloaded. Each event goes to the dashboard's feed and, when that kind is
 * switched on, to his phone as a notification. Callers have already left out link previews and his own
 * browser (`nb_test`). Server only.
 */

export type ActivityKind = "click" | "open" | "cv" | "portfolio";

export type ActivityEvent = {
  at: string;
  kind: ActivityKind;
  /** The link it happened to: "go:<name>" or "cv:<code>". */
  ref: string;
  /** The short link's name, or who the tailored link is for (private). */
  name: string;
  country?: string;
  device?: Device;
  referrer?: string;
};

const FEED = "dash:events";
export const FEED_SIZE = 300;
/** One ping per link a minute: a burst of clicks is one notification, and the feed has every one. */
const QUIET_SECONDS = 60;

const PREF: Record<ActivityKind, keyof Prefs> = { click: "clicks", open: "opens", cv: "downloads", portfolio: "downloads" };
const TITLE: Record<ActivityKind, string> = {
  click: "Short link opened",
  open: "CV link opened",
  cv: "CV downloaded",
  portfolio: "Portfolio downloaded",
};

export const listEvents = (count = FEED_SIZE) => readList<ActivityEvent>(FEED, count);

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
