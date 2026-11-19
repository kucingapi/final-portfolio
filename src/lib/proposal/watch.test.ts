import { beforeEach, describe, expect, it } from "vitest";
import { Watch, PROGRESS_MS } from "./watch";

type Sent = { event: string; props: Record<string, unknown>; beacon: boolean };
type Ping = { body: Record<string, unknown>; beacon: boolean };

let tracked: Sent[];
let pings: Ping[];
let now: number;
let ids: number;

function watch(videos = 2) {
  return new Watch({
    code: "k7qx2pmd",
    videos: Array.from({ length: videos }, (_, i) => ({ id: `video${i}abcd`.slice(0, 11) })),
    track: (event, props, beacon) => tracked.push({ event, props, beacon }),
    ping: (body, beacon) => pings.push({ body, beacon }),
    now: () => now,
    newId: () => `viewing-${++ids}`,
  });
}

/** Play video `i` from `from` to `to`, sampled each second. */
function play(w: Watch, i: number, from: number, to: number) {
  for (let t = from; t <= to; t++) {
    w.sample(i, t, true);
    now += 1000;
  }
}

const names = () => tracked.map((t) => t.event);

beforeEach(() => {
  tracked = [];
  pings = [];
  now = 0;
  ids = 0;
});

describe("Watch", () => {
  it("sends nothing before the first play", () => {
    const w = watch();
    w.sample(0, 0, false);
    w.hide();
    expect(tracked).toEqual([]);
    expect(pings).toEqual([]);
  });

  it("the first play starts a viewing: one start event and one start ping", () => {
    const w = watch();
    w.setDuration(0, 100);
    play(w, 0, 0, 3);
    expect(names()).toEqual(["proposal_viewing_started", "proposal_video_played"]);
    expect(pings).toEqual([{ body: { v: "k7qx2pmd", type: "start", viewing: "viewing-1" }, beacon: false }]);
    expect(tracked[1].props).toMatchObject({ v_code: "k7qx2pmd", viewing: "viewing-1", video: 1, videos: 2 });
  });

  it("sends progress every ~15 s while playing, with the video's stats so far", () => {
    const w = watch();
    w.setDuration(0, 100);
    play(w, 0, 0, 40);
    const progress = tracked.filter((t) => t.event === "proposal_video_progress");
    expect(progress.length).toBe(Math.floor(40_000 / PROGRESS_MS));
    expect(progress.at(-1)!.props).toMatchObject({ v_code: "k7qx2pmd", video: 1, furthest: 30, duration: 100 });
    expect(JSON.parse(progress.at(-1)!.props.stats as string)).toMatchObject({ played: true, furthest: 30 });
  });

  it("reports pause and seek", () => {
    const w = watch();
    play(w, 0, 0, 5);
    w.sample(0, 5, false);
    w.sample(0, 50, false);
    expect(names()).toContain("proposal_video_paused");
    expect(tracked.find((t) => t.event === "proposal_video_seeked")!.props).toMatchObject({ from: 5, to: 50 });
  });

  it("the last video's end ends the viewing with one summary", () => {
    const w = watch(2);
    w.setDuration(0, 10);
    w.setDuration(1, 10);
    play(w, 0, 0, 10);
    w.ended(0);
    play(w, 1, 0, 10);
    w.ended(1);
    expect(names().filter((n) => n === "proposal_video_ended")).toHaveLength(2);
    const end = pings.filter((p) => p.body.type === "end");
    expect(end).toHaveLength(1);
    expect(end[0].body.summary).toEqual({ videos: 2, played: 2, watched: 20, total: 20, last: { video: 2, at: 10, ended: true } });
    expect(names().at(-1)).toBe("proposal_viewing_ended");
  });

  it("hiding the page ends the viewing by beacon, and a later play starts a new one", () => {
    const w = watch(2);
    w.setDuration(0, 100);
    play(w, 0, 0, 20);
    w.hide();
    const end = pings.find((p) => p.body.type === "end")!;
    expect(end.beacon).toBe(true);
    expect(end.body).toMatchObject({ viewing: "viewing-1", summary: { played: 1, last: { video: 1, at: 20, ended: false } } });
    expect(tracked.filter((t) => t.beacon).map((t) => t.event)).toEqual(["proposal_video_progress", "proposal_viewing_ended"]);

    // Still playing in the background tab: no new viewing until the page is back.
    w.sample(0, 25, true);
    expect(pings.filter((p) => p.body.type === "start")).toHaveLength(1);
    w.show();
    play(w, 0, 26, 28);
    expect(pings.filter((p) => p.body.type === "start").map((p) => p.body.viewing)).toEqual(["viewing-1", "viewing-2"]);
  });

  it("hiding twice sends one summary", () => {
    const w = watch();
    play(w, 0, 0, 5);
    w.hide();
    w.hide();
    expect(pings.filter((p) => p.body.type === "end")).toHaveLength(1);
  });
});
