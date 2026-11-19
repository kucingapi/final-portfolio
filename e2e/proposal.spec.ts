import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { capturePostHog, dashboardGet, dashboardSession, fakeYouTube, hidePage, mcp } from "./helpers";

/**
 * Proposal videos, end to end (spec: .scratch/proposal-videos/spec.md): Novel saves a proposal through
 * the MCP, the client opens the tailored link, plays the videos, and leaves; PostHog gets the watch
 * events, the feed gets the two lines, the store gets no watch data, and the dashboard reads it back.
 */

type Saved = { code: string; links: Record<string, string | undefined> };

const VIDEOS = [
  { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "The problem" },
  { url: "https://youtu.be/9bZkp7q19f0", title: "My approach" },
];
const NOTE = "Hi Acme, two short videos on how I'd rebuild your checkout.";

let plain: Saved;
let priced: Saved;
let bare: Saved;

const save = async (request: APIRequestContext, label: string, variant: Record<string, unknown>) => {
  const res = await mcp<Saved>(request, "save_cv_variant", { label, variant });
  expect(res.ok, res.text).toBe(true);
  return res.data;
};

test.beforeAll(async ({ request }) => {
  plain = await save(request, "Acme (e2e)", { mode: "freelance", proposal: { videos: VIDEOS, note: NOTE } });
  priced = await save(request, "Bintang (e2e)", {
    lang: "id",
    mode: "speaker",
    rates: { currency: "IDR", items: [{ id: "talk", price: 3_500_000 }] },
    proposal: { videos: [{ url: "https://www.youtube.com/shorts/dQw4w9WgXcQ", title: "Masalahnya" }] },
  });
  bare = await save(request, "No proposal (e2e)", { mode: "fulltime" });
});

test.afterAll(async ({ request }) => {
  for (const s of [plain, priced, bare]) if (s) await mcp(request, "delete_cv_variant", { code: s.code });
});

test.describe("saving a proposal (MCP)", () => {
  test("stores video ids only and hands out the proposal link", async ({ request }) => {
    expect(plain.links.proposal).toMatch(new RegExp(`/proposal\\?v=${plain.code}$`));
    expect(plain.links.site).toBe(plain.links.proposal);
    expect(priced.links.proposal).toMatch(new RegExp(`/id/proposal\\?v=${priced.code}$`));
    expect(bare.links.proposal).toBeUndefined();

    const got = await mcp<{ variant: { proposal: unknown } }>(request, "get_cv_variant", { code: plain.code });
    expect(got.data.variant.proposal).toEqual({
      videos: [
        { id: "dQw4w9WgXcQ", title: "The problem" },
        { id: "9bZkp7q19f0", title: "My approach" },
      ],
      note: NOTE,
    });
  });

  test("refuses anything that isn't YouTube", async ({ request }) => {
    const res = await mcp(request, "save_cv_variant", {
      label: "Bad (e2e)",
      variant: { proposal: { videos: [{ url: "https://vimeo.com/76979871", title: "Nope" }] } },
    });
    expect(res.ok).toBe(false);
    expect(res.text).toMatch(/proposal\.videos\[1\].*not a YouTube/);
  });
});

test.describe("the client's page", () => {
  test("a link with a proposal opens straight on /proposal, noindex, videos in order @mobile", async ({ page }) => {
    await fakeYouTube(page);
    await capturePostHog(page);
    await page.goto(`/?v=${plain.code}`);
    await expect(page).toHaveURL(/\/proposal$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your proposal");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 2, name: "1. The problem" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "2. My approach" })).toBeVisible();
    await expect(page.getByText("Video 2 of 2")).toBeVisible();
    await expect(page.getByText(NOTE)).toBeVisible();
    await expect(page.locator("[data-fake-yt]")).toHaveCount(2);
    const next = page.locator("[data-proposal-next]");
    await expect(next).toHaveText(/Reply to this proposal/);
    await expect(next).toHaveAttribute("href", `/contact?proposal=${plain.code}`);
    // The proposal isn't in the navbar (the language switch's en/id links do point at this page).
    await expect(page.locator("header").getByRole("link", { name: /proposal/i })).toHaveCount(0);
    // No horizontal scroll on a phone.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("Bahasa link with rates: Bahasa wording and the button goes to the rate card", async ({ page }) => {
    await fakeYouTube(page);
    await capturePostHog(page);
    await page.goto(`/?v=${priced.code}`);
    await expect(page).toHaveURL(/\/id\/proposal$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Proposal untuk Anda");
    await expect(page.getByText("Video 1 dari 1")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "1. Masalahnya" })).toBeVisible();
    const next = page.locator("[data-proposal-next]");
    await expect(next).toHaveText(/Lihat rate card/);
    await next.click();
    await expect(page).toHaveURL(/\/id\/rates$/);
    await expect(page.getByRole("table")).toContainText("3.500.000");
  });

  test("without a proposal, /proposal shows a short note", async ({ page }) => {
    await capturePostHog(page);
    await page.goto(`/?v=${bare.code}`);
    await expect(page).toHaveURL(/\/\?*$/);
    await page.goto("/proposal");
    await expect(page.getByText("This proposal is made for one client")).toBeVisible();
    await expect(page.locator("[data-proposal-next]")).toHaveCount(0);
  });
});

test.describe("watching", () => {
  test("player events go to PostHog with v_code, the feed gets start and summary, the store gets no watch data", async ({ page, request }) => {
    await page.clock.install();
    await fakeYouTube(page);
    const events = await capturePostHog(page);
    const pings: unknown[] = [];
    page.on("request", (r) => r.url().endsWith("/api/proposal") && pings.push(r.postDataJSON()));

    await page.goto(`/?v=${plain.code}`);
    await expect(page).toHaveURL(/\/proposal$/);
    await expect(page.locator("[data-fake-yt]")).toHaveCount(2);
    await page.waitForFunction(() => (window as unknown as { __yt: unknown[] }).__yt?.length === 2);
    // The players get ready a moment after they're made (on the page's fake clock).
    await page.clock.runFor(200);
    const yt = (js: string) => page.evaluate(js);

    // Video 1: 20 s, a skip ahead from 20 to 40, 5 s more, then it ends.
    await yt("__yt[0].play()");
    await page.clock.runFor(20_000);
    await yt("__yt[0].seek(40)");
    await page.clock.runFor(5_000);
    await yt("__yt[0].end()");
    // Video 2: 72 s, then the client leaves.
    await yt("__yt[1].play()");
    await page.clock.runFor(72_000);
    await hidePage(page);
    // Let PostHog's queue flush.
    await page.clock.runFor(5_000);

    await expect.poll(() => pings.length).toBe(2);
    expect(pings[0]).toMatchObject({ v: plain.code, type: "start" });
    expect(pings[1]).toMatchObject({ v: plain.code, type: "end", summary: { videos: 2, played: 2, last: { video: 2, ended: false } } });

    await expect.poll(() => events.map((e) => e.event)).toEqual(
      expect.arrayContaining([
        "proposal_viewed",
        "proposal_viewing_started",
        "proposal_video_played",
        "proposal_video_seeked",
        "proposal_video_progress",
        "proposal_video_ended",
        "proposal_viewing_ended",
      ]),
    );
    const watchEvents = events.filter((e) => e.event.startsWith("proposal_video"));
    for (const e of watchEvents) expect(e.properties.v_code).toBe(plain.code);
    // Seeks show at the next 1 s poll: from the last sample before it (just under 20 s) to just past 40 s.
    const near = (x: unknown, from: number, to: number) => typeof x === "number" && x >= from && x <= to;
    const seek = watchEvents.find((e) => e.event === "proposal_video_seeked")!;
    expect(seek.properties.video).toBe(1);
    expect(near(seek.properties.from, 19, 20.05) && near(seek.properties.to, 40, 41.05), JSON.stringify(seek.properties)).toBe(true);
    const ended = JSON.parse(watchEvents.find((e) => e.event === "proposal_video_ended")!.properties.stats as string);
    expect(ended).toMatchObject({ ended: true, furthest: 60, rewatched: [] });
    expect(ended.skipped).toHaveLength(1);
    expect(near(ended.skipped[0][0], 19, 20.05) && near(ended.skipped[0][1], 40, 41.05), JSON.stringify(ended.skipped)).toBe(true);

    // The feed got the two lines, with the summary.
    await expect
      .poll(async () => {
        const { events: feed } = await dashboardGet<{ events: { ref: string; kind: string; detail?: string }[] }>(request, "/api/dashboard/activity");
        return feed.filter((e) => e.ref === `cv:${plain.code}`).map((e) => [e.kind, e.detail]);
      })
      .toEqual(
        expect.arrayContaining([
          ["proposalStart", undefined],
          ["proposalViewing", expect.stringMatching(/^watched 2 of 2 videos, .* of 2:30, left during video 2 at 1:12$/)],
        ]),
      );

    // Nothing about watching is stored beyond the feed line.
    const dir = path.join(process.cwd(), ".data");
    for (const file of await readdir(dir)) {
      const text = await readFile(path.join(dir, file), "utf8");
      expect(text, file).not.toMatch(/watched_seconds|"skipped"|"rewatched"|proposal_video|"viewing"/);
    }
  });

  test("Novel's own browser (?test=1) sends nothing", async ({ page }) => {
    await page.clock.install();
    await fakeYouTube(page);
    const events = await capturePostHog(page);
    const pings: string[] = [];
    page.on("request", (r) => r.url().endsWith("/api/proposal") && pings.push(r.url()));
    await page.goto(`/proposal?test=1`);
    await page.goto(`/?v=${plain.code}`);
    await expect(page).toHaveURL(/\/proposal$/);
    await page.waitForFunction(() => (window as unknown as { __yt: unknown[] }).__yt?.length === 2);
    // The players get ready a moment after they're made (on the page's fake clock).
    await page.clock.runFor(200);
    await page.evaluate("__yt[0].play()");
    await page.clock.runFor(20_000);
    await hidePage(page);
    await page.clock.runFor(5_000);
    expect(pings).toEqual([]);
    expect(events).toEqual([]);
    await page.goto(`/proposal?test=0`);
  });
});

test.describe("replying", () => {
  test("the contact form from a proposal tags the enquiry with the link", async ({ page, request }) => {
    await fakeYouTube(page);
    await capturePostHog(page);
    await page.goto(`/?v=${plain.code}`);
    await expect(page).toHaveURL(/\/proposal$/);
    await page.locator("[data-proposal-next]").click();
    await expect(page).toHaveURL(new RegExp(`/contact\\?proposal=${plain.code}$`));
    // Clicks before hydration do nothing; retry until the form answers.
    const web = page.getByRole("radio", { name: "Web" });
    await expect(async () => {
      await web.click();
      await expect(web).toHaveAttribute("aria-checked", "true", { timeout: 1000 });
    }).toPass();
    await page.getByRole("button", { name: "Next step" }).click();
    const email = `acme-${Date.now()}@example.com`;
    await page.getByPlaceholder("Name").fill("Ana Acme");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Tell me about the project").fill("Loved the videos.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Thanks, Ana!")).toBeVisible();

    const { enquiries } = await dashboardGet<{ enquiries: { id: string; email: string }[] }>(request, "/api/dashboard/enquiries");
    const mine = enquiries.find((e) => e.email === email)!;
    expect(mine).toMatchObject({ service: "Web", proposal: { code: plain.code, label: "Acme (e2e)" } });
    await request.delete(`/api/dashboard/enquiries/${mine.id}`, { headers: { Cookie: `nb_dash=${await dashboardSession(request)}` } });
  });
});

test.describe("dashboard", () => {
  test("the link's sheet shows each viewing per video, with replay links", async ({ page, request, baseURL }) => {
    await page.context().addCookies([{ name: "nb_dash", value: await dashboardSession(request), url: baseURL! }]);
    await page.goto(`/dashboard?link=${encodeURIComponent(`cv:${plain.code}`)}`);
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: "How they watched" })).toBeVisible();
    const viewings = sheet.locator("[data-watch=viewings] > li");
    await expect(viewings).toHaveCount(2);
    const latest = viewings.first();
    await expect(latest).toContainText(/watched 2 of 2 videos, 3:12 of 4:00, left during video 2 at 1:12/i);
    await expect(latest).toContainText("1. The problem");
    await expect(latest).toContainText("2. My approach");
    await expect(latest).toContainText("Skipped: 0:30–0:50");
    await expect(latest).toContainText("Rewatched: 0:10–0:33");
    await expect(latest).toContainText("Dropped at: 1:12");
    await expect(latest.getByRole("link", { name: "Watch this viewing in PostHog" })).toHaveAttribute(
      "href",
      "https://us.posthog.com/project/4242/replay/0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b",
    );
    await expect(viewings.nth(1)).toContainText("Not played");
  });
});
