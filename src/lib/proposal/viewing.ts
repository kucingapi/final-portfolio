/**
 * How one visit watched a proposal's videos: a **viewing** (see GLOSSARY.md). The page polls each YouTube
 * player about once a second and feeds its position here; from those samples alone this works out what
 * was watched, skipped and rewatched, so nothing depends on YouTube's own (seek-less) events. Pure and
 * client-safe; nothing here is stored on the server.
 */

export type Range = [from: number, to: number];

export type VideoStats = {
  /** Pressed play at least once. */
  played: boolean;
  /** Seconds actually played, rewatching included. */
  watched: number;
  /** Seconds of the video seen at least once. */
  covered: number;
  /** The furthest point reached. */
  furthest: number;
  /** Where the player was last seen: where they dropped off, if they left during it. */
  position: number;
  duration: number;
  /** Stretches jumped over (before the furthest point), and stretches played more than once. */
  skipped: Range[];
  rewatched: Range[];
  /** Reached the end. */
  ended: boolean;
};

/** Steps between two polls up to this many seconds are playback (a slow poll, 2× speed); longer is a seek. */
const MAX_STEP = 3;
/** Going back by up to this much is jitter, not a seek. */
const BACK_SLACK = 1;
/** Gaps and overlaps shorter than this aren't worth reporting. */
const MIN_RANGE = 2;

const round = (n: number) => Math.round(n * 10) / 10;

export class VideoTracker {
  private segments: Range[] = [];
  private open: number | null = null;
  private last: number | null = null;
  private ended = false;

  constructor(private duration = 0) {}

  setDuration(seconds: number) {
    if (seconds > 0) this.duration = seconds;
  }

  /** One sample of the player: its position and whether it is playing. A jump comes back as a seek. */
  observe(t: number, playing: boolean): { seek?: { from: number; to: number } } {
    const last = this.last;
    this.last = t;
    if (last === null) {
      if (playing) this.open = t;
      return {};
    }
    if (t < last - BACK_SLACK || t > last + MAX_STEP) {
      this.close(last);
      if (playing) this.open = t;
      return { seek: { from: round(last), to: round(t) } };
    }
    if (this.open === null) {
      if (playing) this.open = t;
    } else if (!playing) this.close(t);
    return {};
  }

  /** The player reported the end. */
  end() {
    if (this.last !== null) this.close(Math.max(this.last, this.duration || this.last));
    if (this.duration) this.last = this.duration;
    this.ended = true;
  }

  private close(at: number) {
    if (this.open !== null && at > this.open) this.segments.push([this.open, at]);
    this.open = null;
  }

  stats(): VideoStats {
    const segments = this.open !== null && this.last !== null && this.last > this.open ? [...this.segments, [this.open, this.last] as Range] : this.segments;
    const played = segments.length > 0 || this.open !== null;
    const watched = segments.reduce((sum, [a, b]) => sum + (b - a), 0);
    // Sweep the segments' edges: depth 0 is a gap, 1 seen once, 2+ seen again.
    const edges = segments.flatMap(([a, b]) => [[a, 1] as const, [b, -1] as const]).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const covered: Range[] = [];
    const again: Range[] = [];
    let depth = 0;
    let coverStart = 0;
    let againStart = 0;
    for (const [at, step] of edges) {
      if (step === 1) {
        if (depth === 0) coverStart = at;
        if (depth === 1) againStart = at;
      } else {
        if (depth === 2) again.push([againStart, at]);
        if (depth === 1) covered.push([coverStart, at]);
      }
      depth += step;
    }
    const merged = merge(covered);
    const furthest = merged.at(-1)?.[1] ?? 0;
    const skipped: Range[] = [];
    let from = 0;
    for (const [a, b] of merged) {
      if (a - from >= MIN_RANGE) skipped.push([from, a]);
      from = b;
    }
    const big = (r: Range) => r[1] - r[0] >= MIN_RANGE;
    const r = (x: Range): Range => [round(x[0]), round(x[1])];
    return {
      played,
      watched: round(watched),
      covered: round(merged.reduce((sum, [a, b]) => sum + (b - a), 0)),
      furthest: round(furthest),
      position: round(this.last ?? 0),
      duration: round(this.duration),
      skipped: skipped.map(r),
      rewatched: merge(again).filter(big).map(r),
      ended: this.ended,
    };
  }
}

/** Touching or overlapping ranges joined (within a poll's slack). */
function merge(ranges: Range[]): Range[] {
  const out: Range[] = [];
  for (const [a, b] of [...ranges].sort((x, y) => x[0] - y[0])) {
    const last = out.at(-1);
    if (last && a <= last[1] + BACK_SLACK) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/** A whole viewing in a few numbers: the summary the feed line and the phone ping are written from. */
export type ViewingSummary = {
  videos: number;
  /** Videos played at all. */
  played: number;
  /** Seconds seen at least once, across the videos, and the videos' total length. */
  watched: number;
  total: number;
  /** The video they were on when the viewing ended (1-based), where in it, and whether it had ended. */
  last?: { video: number; at: number; ended: boolean };
};

export function summarize(videos: VideoStats[], current: number | null): ViewingSummary {
  const on = current === null ? undefined : videos[current];
  return {
    videos: videos.length,
    played: videos.filter((v) => v.played).length,
    watched: Math.round(videos.reduce((sum, v) => sum + v.covered, 0)),
    total: Math.round(videos.reduce((sum, v) => sum + v.duration, 0)),
    last: on && current !== null ? { video: current + 1, at: Math.round(on.position), ended: on.ended } : undefined,
  };
}

/** Seconds as m:ss (or h:mm:ss). */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** "watched 2 of 3 videos, 6:10 of 9:30, left during video 3 at 1:12": the feed line's detail. */
export function viewingDetail(s: ViewingSummary): string {
  const parts = [`watched ${s.played} of ${s.videos} ${s.videos === 1 ? "video" : "videos"}`, `${clock(s.watched)} of ${clock(s.total)}`];
  if (s.last) {
    if (s.last.ended) parts.push(s.last.video === s.videos ? "to the end" : `stopped after video ${s.last.video}`);
    else parts.push(`left during video ${s.last.video} at ${clock(s.last.at)}`);
  }
  return parts.join(", ");
}

/** "Acme: watched 2 of 3 videos, 6:10 of 9:30, left during video 3 at 1:12": the phone ping. */
export const describeViewing = (name: string, s: ViewingSummary) => `${name}: ${viewingDetail(s)}`;
