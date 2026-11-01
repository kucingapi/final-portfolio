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
  window.__nbAnalytics ??= !KEY
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
                session_recording: { maskAllInputs: true },
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
