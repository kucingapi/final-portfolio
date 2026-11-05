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
    : new Promise<PostHog | null>((resolve) =>
        idle(() =>
          import("posthog-js")
            .then(({ default: posthog }) => {
              posthog.init(KEY, {
                api_host: "/relay",
                ui_host: "https://eu.posthog.com",
                defaults: "2026-08-30",
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
                },
              });
              resolve(posthog);
            })
            .catch(() => resolve(null)),
        ),
      );
  return window.__nbAnalytics;
}

export function track(event: string, properties?: Record<string, unknown>) {
  void loadAnalytics().then((ph) => ph?.capture(event, properties));
}

/** Add properties to this visitor's every later event (kept across visits). */
export function tagVisitor(properties: Record<string, string>) {
  void loadAnalytics().then((ph) => ph?.register(properties));
}
