import { afterEach, describe, expect, it, vi } from "vitest";
import { readWatch } from "./posthog-read";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("readWatch", () => {
  it("says which settings are missing, without calling PostHog", async () => {
    vi.stubEnv("POSTHOG_PERSONAL_API_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_ID", "123");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await readWatch("k7qx2pmd", 2)).toEqual({ status: "missing", missing: ["POSTHOG_PERSONAL_API_KEY"] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("queries HogQL with the key, binding the link's code", async () => {
    vi.stubEnv("POSTHOG_PERSONAL_API_KEY", "phx_secret");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_ID", "123");
    const fetch = vi.fn().mockResolvedValue(
      Response.json({ results: [["v1", 1, JSON.stringify({ played: true, watched: 5, covered: 5, furthest: 5, position: 5, duration: 9, skipped: [], rewatched: [], ended: false }), "2026-11-19T09:00:00Z", "2026-11-19T09:01:00Z", "s1"]] }),
    );
    vi.stubGlobal("fetch", fetch);
    const out = await readWatch("k7qx2pmd", 1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://us.posthog.com/api/projects/123/query/");
    expect(init.headers.Authorization).toBe("Bearer phx_secret");
    const body = JSON.parse(init.body);
    expect(body.query.kind).toBe("HogQLQuery");
    expect(body.query.values).toEqual({ code: "k7qx2pmd" });
    expect(out).toMatchObject({ status: "ok", viewings: [{ viewing: "v1", session: "s1" }] });
  });

  it("explains a refused key", async () => {
    vi.stubEnv("POSTHOG_PERSONAL_API_KEY", "bad");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_PROJECT_ID", "123");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 403 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await readWatch("k7qx2pmd", 1)).toMatchObject({ status: "error", error: expect.stringMatching(/403.*personal API key/) });
  });
});
