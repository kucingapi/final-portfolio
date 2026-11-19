import { describe, expect, it } from "vitest";
import { WATCH_QUERY, toViewings } from "./watch-data";

const stats = (o: object) => JSON.stringify({ played: true, watched: 10, covered: 10, furthest: 10, position: 10, duration: 60, skipped: [], rewatched: [], ended: false, ...o });

describe("toViewings", () => {
  it("groups the latest snapshot per video under its viewing, newest viewing first", () => {
    const rows = [
      ["v-old", 1, stats({ furthest: 60, ended: true }), "2026-11-18T10:00:00Z", "2026-11-18T10:01:00Z", "sess-1"],
      ["v-new", 2, stats({ furthest: 30, position: 30 }), "2026-11-19T09:05:00Z", "2026-11-19T09:06:00Z", "sess-2"],
      ["v-new", 1, stats({ furthest: 60, ended: true }), "2026-11-19T09:00:00Z", "2026-11-19T09:04:00Z", "sess-2"],
    ];
    const out = toViewings(rows, 2);
    expect(out.map((v) => v.viewing)).toEqual(["v-new", "v-old"]);
    expect(out[0]).toMatchObject({ started: "2026-11-19T09:00:00.000Z", last: "2026-11-19T09:06:00.000Z", session: "sess-2" });
    expect(out[0].videos.map((v) => [v.video, v.stats?.furthest])).toEqual([
      [1, 60],
      [2, 30],
    ]);
    expect(out[0].summary).toMatchObject({ videos: 2, played: 2, last: { video: 2, at: 30, ended: false } });
    // A video the viewing never reached is there, unplayed.
    expect(out[1].videos[1]).toEqual({ video: 2, stats: null });
  });

  it("skips rows it can't read", () => {
    expect(toViewings([["v", 1, "not json", "2026-11-19T09:00:00Z", "2026-11-19T09:00:00Z", null], ["bad"]], 1)).toEqual([
      expect.objectContaining({ viewing: "v", videos: [{ video: 1, stats: null }] }),
    ]);
  });

  it("filters by the link's code through a placeholder, never by pasting it in", () => {
    expect(WATCH_QUERY).toContain("{code}");
    expect(WATCH_QUERY).not.toMatch(/'[a-z0-9]{8}'/);
  });
});
