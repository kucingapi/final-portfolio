import { summarize, type VideoStats, type ViewingSummary } from "./viewing";

/**
 * A proposal's watch data as the dashboard shows it, read back from PostHog (the only place it is kept).
 * Every event of a viewing carries its video's stats so far (src/lib/proposal/watch.ts), so the latest
 * event per viewing and video is that video's whole story. Client-safe; the query runs on the server.
 */

export type WatchedVideo = { video: number; stats: VideoStats | null };
export type WatchViewing = {
  viewing: string;
  started: string;
  last: string;
  /** The PostHog session, for its replay. */
  session: string | null;
  videos: WatchedVideo[];
  summary: ViewingSummary;
};

export type WatchData = { status: "ok"; viewings: WatchViewing[] } | { status: "missing"; missing: string[] } | { status: "error"; error: string };

/** HogQL: one row per viewing and video, with its latest stats. `{code}` is bound by the query API. */
export const WATCH_QUERY = `SELECT
  properties.viewing AS viewing,
  toInt(properties.video) AS video,
  argMax(properties.stats, timestamp) AS stats,
  min(timestamp) AS started,
  max(timestamp) AS last,
  any(properties.$session_id) AS session
FROM events
WHERE event IN ('proposal_video_played', 'proposal_video_paused', 'proposal_video_seeked', 'proposal_video_ended', 'proposal_video_progress')
  AND properties.v_code = {code}
  AND timestamp > now() - INTERVAL 180 DAY
GROUP BY viewing, video
ORDER BY started DESC
LIMIT 1000`;

function parseStats(raw: unknown): VideoStats | null {
  if (typeof raw !== "string") return null;
  try {
    const s = JSON.parse(raw);
    return s && typeof s === "object" && typeof s.watched === "number" ? (s as VideoStats) : null;
  } catch {
    return null;
  }
}

const iso = (v: unknown) => (typeof v === "string" ? new Date(v.includes("T") || v.endsWith("Z") ? v : `${v.replace(" ", "T")}Z`).toISOString() : "");

/** The query's rows as viewings, newest first, each with one entry per video of the proposal (`videos`). */
export function toViewings(rows: unknown[][], videos: number): WatchViewing[] {
  const byId = new Map<string, { started: string; last: string; session: string | null; stats: Map<number, VideoStats | null> }>();
  for (const row of rows) {
    const [viewing, video, stats, started, last, session] = row;
    if (typeof viewing !== "string" || !viewing || typeof video !== "number") continue;
    const at = { started: iso(started), last: iso(last) };
    const v = byId.get(viewing) ?? { started: at.started, last: at.last, session: null, stats: new Map() };
    if (at.started && (!v.started || at.started < v.started)) v.started = at.started;
    if (at.last > v.last) v.last = at.last;
    if (typeof session === "string" && session) v.session = session;
    v.stats.set(video, parseStats(stats));
    byId.set(viewing, v);
  }
  const count = Math.max(videos, ...[...byId.values()].flatMap((v) => [...v.stats.keys()]));
  return [...byId.entries()]
    .map(([viewing, v]) => {
      const list: WatchedVideo[] = Array.from({ length: count }, (_, i) => ({ video: i + 1, stats: v.stats.get(i + 1) ?? null }));
      // The video they were on at the end: the last one played (furthest along the list).
      const on = list.findLastIndex((x) => x.stats?.played);
      const filled = list.map((x) => x.stats ?? { played: false, watched: 0, covered: 0, furthest: 0, position: 0, duration: 0, skipped: [], rewatched: [], ended: false });
      return { viewing, started: v.started, last: v.last, session: v.session, videos: list, summary: summarize(filled, on < 0 ? null : on) };
    })
    .sort((a, b) => b.started.localeCompare(a.started));
}
