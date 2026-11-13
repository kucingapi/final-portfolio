import type { PostHog } from "posthog-js";

/**
 * Product analytics: PostHog's EU cloud, sent through this site's own `/relay` path (see the rewrites
 * in next.config.ts) so ad blockers leave it alone. Off unless NEXT_PUBLIC_POSTHOG_KEY is set. The
 * library loads once the browser is idle, and calls made before then wait for it.
 *
 * Every event carries `v_code` when the visitor came through a tailored link, so one link's visits,
 * pages read and CV downloads can be filtered together.
 */

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const TEST_COOKIE = "nb_test";
/**
 * The visitor's PostHog session and person, as `<session>.<distinct id>`, for the server: the feed events
 * it records (link opens, PDF downloads, messages) carry them, so the dashboard can open that visit's
 * replay, and the server sends the same events to PostHog under the same person and session.
 */
const SESSION_COOKIE = "nb_ph";

function uuidv7() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  let t = Date.now();
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const remember = (session: string, person: string) => {
  document.cookie = `${SESSION_COOKIE}=${session}.${person}; path=/; samesite=lax`;
};

/**
 * PostHog loads when the browser is idle, but a tailored link's open is reported at once. On a first
 * visit, pick the session and person ids now and hand them to PostHog, so that open already points at
 * the replay. A returning visitor keeps PostHog's own ids, and the cookie still holds them from before.
 */
function bootstrap(): { sessionID: string; distinctID: string } | undefined {
  try {
    if (localStorage.getItem(`ph_${KEY}_posthog`)) return undefined;
  } catch {}
  const ids = { sessionID: uuidv7(), distinctID: uuidv7() };
  remember(ids.sessionID, ids.distinctID);
  return ids;
}

/**
 * Novel's own browser. Visiting any page with `?test=1` marks it for a year, and `?test=0` clears the
 * mark. A marked browser sends nothing to PostHog, and the server doesn't count its link opens or PDF
 * downloads (it reads the same cookie; see `fromTester` in src/lib/cv/store.ts).
 */
export function isTester(): boolean {
  if (typeof window === "undefined") return false;
  const param = new URLSearchParams(window.location.search).get("test");
  if (param === "1") document.cookie = `${TEST_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
  if (param === "0") document.cookie = `${TEST_COOKIE}=; path=/; max-age=0; samesite=lax`;
  return param === "1" || (param !== "0" && document.cookie.split("; ").includes(`${TEST_COOKIE}=1`));
}

declare global {
  interface Window {
    __nbAnalytics?: Promise<PostHog | null>;
  }
}

const idle = (fn: () => void) =>
  "requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500);

/** Start PostHog (once). `tags` are added to every event from the first pageview on. */
export function loadAnalytics(tags?: Record<string, string>): Promise<PostHog | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  window.__nbAnalytics ??= !KEY || isTester()
    ? Promise.resolve(null)
    : new Promise<PostHog | null>((resolve) => {
        const ids = bootstrap();
        idle(() =>
          import("posthog-js")
            .then(({ default: posthog }) => {
              posthog.init(KEY, {
                api_host: "/relay",
                ui_host: "https://eu.posthog.com",
                defaults: "2026-08-30",
                ...(ids && { bootstrap: ids }),
                person_profiles: "identified_only",
                // Inputs are masked; so is any text marked data-ph-mask (the contact thank-you, which names the visitor).
                session_recording: { maskAllInputs: true, maskTextSelector: "[data-ph-mask]" },
                // The landing pageview can fire before `register` lands, so tag it on the way out too.
                before_send: (event) => {
                  if (event && tags) Object.assign(event.properties, { ...tags, ...event.properties });
                  return event;
                },
                loaded: (ph) => {
                  if (tags) ph.register(tags);
                  remember(ph.get_session_id(), ph.get_distinct_id());
                  ph.onSessionId((session) => remember(session, ph.get_distinct_id()));
                },
              });
              resolve(posthog);
            })
            .catch(() => resolve(null)),
        );
      });
  return window.__nbAnalytics;
}

export function track(event: string, properties?: Record<string, unknown>) {
  void loadAnalytics().then((ph) => ph?.capture(event, properties));
}

/** Add properties to this visitor's every later event (kept across visits). */
export function tagVisitor(properties: Record<string, string>) {
  void loadAnalytics().then((ph) => ph?.register(properties));
}
