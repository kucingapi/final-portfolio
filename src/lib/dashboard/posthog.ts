import type { ActivityEvent } from "./activity";

/**
 * Ties the dashboard's feed to PostHog. The browser keeps its PostHog session and person in the `nb_ph`
 * cookie (src/lib/analytics.ts); events recorded on the server carry them, so the feed can link to the
 * visit's session replay, and each event is also sent to PostHog, where it shows in the person's
 * activity and on the replay's timeline. Server only.
 */

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const ID = /^[0-9a-f-]{8,64}$/i;

export type Visit = { session?: string; person?: string };

/** The visitor's PostHog session and person, when their browser has loaded analytics on this site. */
export function visitFrom(request: Request): Visit {
  const raw = (request.headers.get("cookie") ?? "").match(/(?:^|;\s*)nb_ph=([^;]+)/)?.[1];
  const [session, person] = decodeURIComponent(raw ?? "").split(".");
  return { session: session && ID.test(session) ? session : undefined, person: person && ID.test(person) ? person : undefined };
}

const NAME: Record<ActivityEvent["kind"], string> = {
  click: "short_link_opened",
  open: "cv_link_opened",
  cv: "cv_downloaded",
  portfolio: "portfolio_downloaded",
  rates: "rate_card_downloaded",
  rateViews: "rate_card_viewed",
  enquiry: "enquiry_received",
};

/**
 * Send a feed event to PostHog. Only what identifies the link goes (its ref, never who it was made
 * for, nor a message's sender or words). Events without a person are skipped: they'd make a new one.
 */
export async function capture(e: ActivityEvent) {
  if (!KEY || !e.person) return;
  const code = e.ref.startsWith("cv:") ? e.ref.slice(3) : undefined;
  const res = await fetch("https://eu.i.posthog.com/i/v0/e/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: KEY,
      event: NAME[e.kind],
      distinct_id: e.person,
      timestamp: e.at,
      properties: {
        ref: e.ref,
        ...(code && { v_code: code }),
        ...(e.session && { $session_id: e.session }),
        country: e.country,
        device: e.device,
        referrer_host: e.referrer,
        source: "server",
        $process_person_profile: false,
      },
    }),
  });
  if (!res.ok) throw new Error(`PostHog capture ${res.status}`);
}
