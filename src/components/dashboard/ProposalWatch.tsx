"use client";

import { CheckCircle2, PlayCircle } from "lucide-react";
import type { Range } from "@/lib/proposal/viewing";
import { clock as time, viewingDetail } from "@/lib/proposal/viewing";
import type { WatchData, WatchViewing } from "@/lib/proposal/watch-data";
import { replayUrl } from "./Activity";
import { useApi } from "./api";
import { ago } from "./format";
import { Problem } from "./Problem";
import { Skeleton } from "./ui/skeleton";

const ranges = (list: Range[]) => (list.length ? list.map(([a, b]) => `${time(a)}–${time(b)}`).join(", ") : "–");

/**
 * How a tailored link's proposal was watched: each viewing, newest first, per video (watched, furthest,
 * dropped at, skipped, rewatched, finished), with its PostHog replay. Read from PostHog as the sheet
 * opens; nothing about watching is stored on the site.
 */
export function ProposalWatch({ code, videos }: { code: string; videos: { id: string; title: string }[] }) {
  const watch = useApi<WatchData>(`/api/dashboard/proposal/${code}`);
  if (watch.error) return <Problem message={watch.error} onRetry={watch.reload} />;
  const data = watch.data;
  if (!data) return <Skeleton className="h-32 w-full rounded-xl" />;
  if (data.status === "missing") {
    return (
      <p role="status" data-watch="missing" className="rounded-xl border border-dashed border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        To see how they watched, add a PostHog personal API key (with query read access) on Vercel as{" "}
        <code className="text-foreground">POSTHOG_PERSONAL_API_KEY</code>
        {data.missing.includes("NEXT_PUBLIC_POSTHOG_PROJECT_ID") && (
          <>
            , and the project&apos;s id as <code className="text-foreground">NEXT_PUBLIC_POSTHOG_PROJECT_ID</code>
          </>
        )}
        , then redeploy. Missing now: {data.missing.join(", ")}.
      </p>
    );
  }
  if (data.status === "error") return <Problem message={data.error} onRetry={watch.reload} />;
  if (!data.viewings.length) {
    return (
      <p data-watch="empty" className="text-sm leading-relaxed text-muted-foreground">
        Nobody has pressed play yet. Your own browser (with ?test=1) is never counted.
      </p>
    );
  }
  return (
    <ul data-watch="viewings" className="flex flex-col gap-4">
      {data.viewings.map((v) => (
        <Viewing key={v.viewing} v={v} titles={videos.map((x) => x.title)} />
      ))}
    </ul>
  );
}

function Viewing({ v, titles }: { v: WatchViewing; titles: string[] }) {
  return (
    <li className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-baseline justify-between gap-3 bg-muted px-4 py-2.5">
        <span className="min-w-0 text-sm font-medium text-foreground first-letter:uppercase">{viewingDetail(v.summary)}</span>
        <time dateTime={v.started} className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {ago(v.started)}
        </time>
      </div>
      <ol className="divide-y divide-border">
        {v.videos.map(({ video, stats: s }) => (
          <li key={video} className="flex flex-col gap-1.5 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 font-medium text-foreground">
              {video}. {titles[video - 1] ?? `Video ${video}`}
              {s?.ended && <CheckCircle2 className="size-4 text-primary" aria-label="Finished" />}
            </span>
            {s?.played ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[0.8125rem] text-muted-foreground sm:grid-cols-3">
                <Stat label="Watched" value={`${time(s.watched)} of ${time(s.duration)}`} />
                <Stat label="Furthest" value={time(s.furthest)} />
                <Stat label={s.ended ? "Finished" : "Dropped at"} value={s.ended ? "yes" : time(s.position)} />
                <Stat label="Skipped" value={ranges(s.skipped)} />
                <Stat label="Rewatched" value={ranges(s.rewatched)} />
              </dl>
            ) : (
              <span className="text-[0.8125rem] text-muted-foreground">Not played</span>
            )}
          </li>
        ))}
      </ol>
      {v.session && (
        <a
          href={replayUrl(v.session)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 border-t border-border px-4 py-2.5 text-[0.8125rem] font-medium text-primary transition-colors duration-150 hover:bg-accent/60"
        >
          <PlayCircle className="size-4" />
          Watch this viewing in PostHog
        </a>
      )}
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="inline">{label}: </dt>
      <dd className="inline text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
