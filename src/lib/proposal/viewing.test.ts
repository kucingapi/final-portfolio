import { describe, expect, it } from "vitest";
import { VideoTracker, clock, describeViewing, summarize, type VideoStats } from "./viewing";

/** Play from `from` to `to`, observed once a second as the player is polled. */
function playThrough(v: VideoTracker, from: number, to: number) {
  for (let t = from; t <= to; t++) v.observe(t, true);
}

describe("VideoTracker", () => {
  it("starts unplayed", () => {
    const s = new VideoTracker(120).stats();
    expect(s).toMatchObject({ played: false, watched: 0, furthest: 0, skipped: [], rewatched: [], ended: false });
  });

  it("counts the seconds actually watched and the furthest point", () => {
    const v = new VideoTracker(120);
    playThrough(v, 0, 30);
    v.observe(30, false);
    expect(v.stats()).toMatchObject({ played: true, watched: 30, covered: 30, furthest: 30, position: 30 });
  });

  it("does not count paused time", () => {
    const v = new VideoTracker(120);
    playThrough(v, 0, 10);
    v.observe(10, false);
    v.observe(10, false);
    v.observe(10, false);
    playThrough(v, 10, 20);
    expect(v.stats().watched).toBe(20);
  });

  it("reports a jump forward as a seek and the jumped-over range as skipped", () => {
    const v = new VideoTracker(120);
    playThrough(v, 0, 10);
    expect(v.observe(60, true)).toEqual({ seek: { from: 10, to: 60 } });
    playThrough(v, 61, 70);
    const s = v.stats();
    expect(s.skipped).toEqual([[10, 60]]);
    expect(s.watched).toBe(20);
    expect(s.furthest).toBe(70);
  });

  it("reports a jump back as a seek and the replayed range as rewatched", () => {
    const v = new VideoTracker(120);
    playThrough(v, 0, 40);
    expect(v.observe(20, true)).toEqual({ seek: { from: 40, to: 20 } });
    playThrough(v, 21, 50);
    const s = v.stats();
    expect(s.rewatched).toEqual([[20, 40]]);
    expect(s.watched).toBe(70);
    expect(s.covered).toBe(50);
    expect(s.skipped).toEqual([]);
  });

  it("a seek while paused is a seek too", () => {
    const v = new VideoTracker(120);
    playThrough(v, 0, 10);
    v.observe(10, false);
    expect(v.observe(50, false)).toEqual({ seek: { from: 10, to: 50 } });
    playThrough(v, 50, 55);
    expect(v.stats().skipped).toEqual([[10, 50]]);
  });

  it("ignores tiny gaps and overlaps", () => {
    const v = new VideoTracker(120);
    playThrough(v, 0, 10);
    v.observe(11.5, true); // within a poll's slack: still watching
    playThrough(v, 12, 20);
    expect(v.stats().skipped).toEqual([]);
  });

  it("records the end", () => {
    const v = new VideoTracker(30);
    playThrough(v, 0, 30);
    v.end();
    expect(v.stats()).toMatchObject({ ended: true, furthest: 30, watched: 30 });
  });

  it("starting part way (a seek before the first play) skips the start", () => {
    const v = new VideoTracker(120);
    playThrough(v, 30, 40);
    expect(v.stats().skipped).toEqual([[0, 30]]);
  });
});

const stats = (o: Partial<VideoStats>): VideoStats => ({
  played: false,
  watched: 0,
  covered: 0,
  furthest: 0,
  position: 0,
  duration: 0,
  skipped: [],
  rewatched: [],
  ended: false,
  ...o,
});

describe("summarize and describeViewing", () => {
  it("formats seconds as m:ss", () => {
    expect(clock(0)).toBe("0:00");
    expect(clock(72)).toBe("1:12");
    expect(clock(370.6)).toBe("6:10");
    expect(clock(3725)).toBe("1:02:05");
  });

  it("left during a video", () => {
    const s = summarize(
      [
        stats({ played: true, covered: 200, duration: 200, ended: true, position: 200 }),
        stats({ played: true, covered: 98, duration: 250, position: 120 }),
        stats({ played: true, covered: 72, duration: 120, position: 72 }),
      ],
      2,
    );
    expect(s).toEqual({ videos: 3, played: 3, watched: 370, total: 570, last: { video: 3, at: 72, ended: false } });
    expect(describeViewing("Acme", s)).toBe("Acme: watched 3 of 3 videos, 6:10 of 9:30, left during video 3 at 1:12");
  });

  it("watched to the end", () => {
    const s = summarize([stats({ played: true, covered: 60, duration: 60, ended: true, position: 60 })], 0);
    expect(describeViewing("Acme", s)).toBe("Acme: watched 1 of 1 video, 1:00 of 1:00, to the end");
  });

  it("counts only videos played, and durations of all", () => {
    const s = summarize([stats({ played: true, covered: 30, duration: 100, position: 30 }), stats({ duration: 80 })], 0);
    expect(describeViewing("Acme", s)).toBe("Acme: watched 1 of 2 videos, 0:30 of 3:00, left during video 1 at 0:30");
  });
});
