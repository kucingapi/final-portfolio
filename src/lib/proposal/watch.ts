import { VideoTracker, summarize, type ViewingSummary } from "./viewing";

/**
 * One proposal page's watch tracking: the players' samples in, PostHog events and the server's two pings
 * out. A **viewing** starts at the first play and ends when the last video ends or the page is hidden;
 * a play after that starts the next viewing. Every PostHog event carries the link's `v_code`, the viewing
 * and the video's stats so far, so the latest event per viewing and video is the whole story (the
 * dashboard reads it that way). The sinks are passed in, so this runs (and is tested) without a browser.
 */

export const PROGRESS_MS = 15_000;

export type PingBody = { v: string; type: "start"; viewing: string } | { v: string; type: "end"; viewing: string; summary: ViewingSummary };

type Options = {
  code: string;
  videos: { id: string }[];
  track: (event: string, props: Record<string, unknown>, beacon: boolean) => void;
  ping: (body: PingBody, beacon: boolean) => void;
  now?: () => number;
  newId?: () => string;
};

type Viewing = { id: string; trackers: VideoTracker[]; playing: boolean[]; current: number | null; lastProgress: number };

export class Watch {
  private viewing: Viewing | null = null;
  private durations: number[];
  private hidden = false;
  private now: () => number;
  private newId: () => string;

  constructor(private o: Options) {
    this.durations = o.videos.map(() => 0);
    this.now = o.now ?? (() => Date.now());
    this.newId = o.newId ?? (() => crypto.randomUUID());
  }

  setDuration(i: number, seconds: number) {
    if (!(seconds > 0)) return;
    this.durations[i] = seconds;
    this.viewing?.trackers[i].setDuration(seconds);
  }

  /** A player's position and state, from the poll or a state change. */
  sample(i: number, t: number, playing: boolean) {
    if (!this.viewing) {
      if (!playing || this.hidden) return;
      this.begin();
    }
    const v = this.viewing!;
    const { seek } = v.trackers[i].observe(t, playing);
    if (seek) this.send("proposal_video_seeked", i, { from: seek.from, to: seek.to });
    if (playing && !v.playing[i]) this.send("proposal_video_played", i);
    if (!playing && v.playing[i]) this.send("proposal_video_paused", i);
    v.playing[i] = playing;
    if (!playing) return;
    v.current = i;
    if (this.now() - v.lastProgress >= PROGRESS_MS) {
      v.lastProgress = this.now();
      this.send("proposal_video_progress", i);
    }
  }

  /** A player reached its end; the last one's end ends the viewing. */
  ended(i: number) {
    const v = this.viewing;
    if (!v) return;
    v.trackers[i].end();
    v.playing[i] = false;
    v.current = i;
    this.send("proposal_video_ended", i);
    if (i === this.o.videos.length - 1) this.finish(false);
  }

  /** The page was hidden (closed, or left in the background): the viewing ends, by beacon. */
  hide() {
    this.hidden = true;
    const v = this.viewing;
    if (!v) return;
    if (v.current !== null) this.send("proposal_video_progress", v.current, {}, true);
    this.finish(true);
  }

  show() {
    this.hidden = false;
  }

  private begin() {
    const id = this.newId();
    this.viewing = {
      id,
      trackers: this.durations.map((d) => new VideoTracker(d)),
      playing: this.durations.map(() => false),
      current: null,
      lastProgress: this.now(),
    };
    this.o.track("proposal_viewing_started", { v_code: this.o.code, viewing: id, videos: this.o.videos.length }, false);
    this.o.ping({ v: this.o.code, type: "start", viewing: id }, false);
  }

  private finish(beacon: boolean) {
    const v = this.viewing;
    if (!v) return;
    this.viewing = null;
    const summary = summarize(
      v.trackers.map((t) => t.stats()),
      v.current,
    );
    this.o.track("proposal_viewing_ended", { v_code: this.o.code, viewing: v.id, ...summary, last: undefined, ...lastProps(summary) }, beacon);
    this.o.ping({ v: this.o.code, type: "end", viewing: v.id, summary }, beacon);
  }

  private send(event: string, i: number, extra: Record<string, unknown> = {}, beacon = false) {
    const v = this.viewing!;
    const stats = v.trackers[i].stats();
    this.o.track(
      event,
      {
        v_code: this.o.code,
        viewing: v.id,
        video: i + 1,
        video_id: this.o.videos[i].id,
        videos: this.o.videos.length,
        position: stats.position,
        watched_seconds: stats.watched,
        furthest: stats.furthest,
        duration: stats.duration,
        ended: stats.ended,
        stats: JSON.stringify(stats),
        ...extra,
      },
      beacon,
    );
  }
}

const lastProps = (s: ViewingSummary) => (s.last ? { last_video: s.last.video, last_at: s.last.at, last_ended: s.last.ended } : {});
