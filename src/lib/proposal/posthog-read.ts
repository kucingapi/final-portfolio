import { isCode } from "@/lib/cv/store";
import { WATCH_QUERY, toViewings, type WatchData } from "./watch-data";

/**
 * Reads a proposal's watch data from PostHog's query API (HogQL), filtered by the link's `v_code`. It
 * needs a personal API key with query read access (POSTHOG_PERSONAL_API_KEY) and the project's id;
 * without them it says which are missing, and the dashboard says so. Nothing is cached or stored here.
 * Server only.
 */
export async function readWatch(code: string, videos: number): Promise<WatchData> {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const project = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID;
  const missing = [!key && "POSTHOG_PERSONAL_API_KEY", !project && "NEXT_PUBLIC_POSTHOG_PROJECT_ID"].filter((x): x is string => Boolean(x));
  if (missing.length) return { status: "missing", missing };
  if (!isCode(code) || !/^\d+$/.test(project!)) return { status: "error", error: "Bad link code or project id." };
  const host = (process.env.POSTHOG_API_HOST || "https://us.posthog.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${host}/api/projects/${project}/query/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: WATCH_QUERY, values: { code } }, name: "proposal watch data" }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const hint = res.status === 401 || res.status === 403 ? " Check that the personal API key is valid and can read queries for this project." : "";
      console.error("[proposal] PostHog query", res.status, detail.slice(0, 300));
      return { status: "error", error: `PostHog answered ${res.status}.${hint}` };
    }
    const body = (await res.json()) as { results?: unknown[][] };
    return { status: "ok", viewings: toViewings(body.results ?? [], videos) };
  } catch (e) {
    console.error("[proposal] PostHog query", e);
    return { status: "error", error: "Couldn't reach PostHog. Try again." };
  }
}
