"use client";

import { BellRing, Eye, FileDown, Mail, MessageCircle, MousePointerClick, PlayCircle, Presentation, Receipt, X } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { View } from "./App";
import { type ActivityEvent, useDashboard } from "./data";
import { clock, countryName, dayHeading } from "./format";
import { Problem } from "./Problem";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { useNotifications } from "./useNotifications";

export const KIND = {
  enquiry: { label: "Message", icon: Mail },
  chat: { label: "Asked AI Novel", icon: MessageCircle },
  click: { label: "Short link opened", icon: MousePointerClick },
  open: { label: "CV link opened", icon: Eye },
  cv: { label: "CV downloaded", icon: FileDown },
  portfolio: { label: "Portfolio downloaded", icon: Presentation },
  rateViews: { label: "Rate card viewed", icon: Receipt },
  rates: { label: "Rate card downloaded", icon: Receipt },
} as const;

/** The visit's session replay. With the project id set it opens straight in that project. */
function replayUrl(session: string) {
  const project = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID;
  return project ? `https://eu.posthog.com/project/${project}/replay/${session}` : `https://eu.posthog.com/replay/${session}`;
}

const PAGE = 40;
const WEEK = 7 * 86_400_000;

/** What happened to the links lately, newest first, grouped by day. */
export function ActivityView({ onOpen, onShow }: { onOpen: (ref: string) => void; onShow: (view: View) => void }) {
  const { activity } = useDashboard();
  const events = activity.data?.events;
  return (
    <div className="flex flex-col gap-8">
      <Nudge onShow={onShow} />
      {events ? (
        <>
          <Week events={events} />
          {events.length ? <Feed events={events} onOpen={onOpen} /> : <Empty onShow={onShow} />}
        </>
      ) : activity.error ? (
        <Problem message={activity.error} onRetry={activity.reload} />
      ) : (
        <FeedSkeleton />
      )}
    </div>
  );
}

const N = ({ n }: { n: number }) => <strong className="font-semibold text-foreground tabular-nums">{n}</strong>;

function Week({ events }: { events: ActivityEvent[] }) {
  const [now] = useState(() => Date.now());
  const recent = events.filter((e) => now - Date.parse(e.at) < WEEK);
  const clicks = recent.filter((e) => e.kind === "click").length;
  const opens = recent.filter((e) => e.kind === "open").length;
  const downloads = recent.length - clicks - opens;
  return (
    <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
      In the last 7 days: <N n={clicks} /> short-link {clicks === 1 ? "click" : "clicks"}, <N n={opens} /> CV link{" "}
      {opens === 1 ? "open" : "opens"} and <N n={downloads} /> PDF {downloads === 1 ? "download" : "downloads"}.
    </p>
  );
}

function Feed({ events, onOpen }: { events: ActivityEvent[]; onOpen: (ref: string) => void }) {
  const [shown, setShown] = useState(PAGE);
  const [now] = useState(() => Date.now());
  const days = useMemo(() => {
    const out: { heading: string; events: ActivityEvent[] }[] = [];
    for (const e of events.slice(0, shown)) {
      const heading = dayHeading(e.at, now);
      const last = out.at(-1);
      if (last?.heading === heading) last.events.push(e);
      else out.push({ heading, events: [e] });
    }
    return out;
  }, [events, shown, now]);

  return (
    <div className="flex flex-col gap-7">
      {days.map((day) => (
        <section key={day.heading} aria-label={day.heading}>
          <h2 className="mb-2 px-1 text-[0.8125rem] font-semibold text-muted-foreground">{day.heading}</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {day.events.map((e, i) => (
              <EventRow key={`${e.at}-${e.ref}-${i}`} event={e} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
      {events.length > shown && (
        <Button variant="secondary" className="self-center" onClick={() => setShown((n) => n + PAGE)}>
          Show earlier
        </Button>
      )}
    </div>
  );
}

function EventRow({ event: e, onOpen }: { event: ActivityEvent; onOpen: (ref: string) => void }) {
  const { label, icon: Icon } = KIND[e.kind];
  const details = [label, e.detail, countryName(e.country), e.device, e.referrer && `from ${e.referrer}`].filter(Boolean).join(" · ");
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(e.ref)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-accent/60 active:bg-accent"
      >
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
          <Icon className="size-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-medium text-foreground">{e.kind === "click" ? `/go/${e.name}` : e.name}</span>
          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted-foreground">{details}</span>
        </span>
        <time dateTime={e.at} className="shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums">
          {clock(e.at)}
        </time>
      </button>
      {e.session && (
        <a
          href={replayUrl(e.session)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 border-t border-border/60 px-4 py-2 pl-16 text-[0.8125rem] font-medium text-primary transition-colors duration-150 hover:bg-accent/60"
        >
          <PlayCircle className="size-4" />
          Watch the visit in PostHog
        </a>
      )}
    </li>
  );
}

function Empty({ onShow }: { onShow: (view: View) => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <p className="text-[0.9375rem] font-medium text-foreground">Nothing has happened yet</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        When someone opens one of your short links or tailored CV links, or downloads a PDF from one, it shows up here.
      </p>
      <Button variant="secondary" className="mt-5" onClick={() => onShow("links")}>
        Go to your links
      </Button>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-5 w-3/4" />
      <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Notification nudge -----------------------------------------------------------------------------

const DISMISSED = "dash.nudge.dismissed";
const DISMISS_EVENT = "dash:nudge";
const onDismiss = (cb: () => void) => {
  window.addEventListener(DISMISS_EVENT, cb);
  return () => window.removeEventListener(DISMISS_EVENT, cb);
};
function wasDismissed() {
  try {
    return localStorage.getItem(DISMISSED) === "1";
  } catch {
    return false;
  }
}

/** Once, until dismissed: notifications are the point of having this on a phone. */
function Nudge({ onShow }: { onShow: (view: View) => void }) {
  const n = useNotifications();
  const dismissed = useSyncExternalStore(onDismiss, wasDismissed, () => true);
  if (dismissed || n.loading || n.on || !n.support || n.support === "unsupported" || n.permission === "denied") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, "1");
    } catch {}
    window.dispatchEvent(new Event(DISMISS_EVENT));
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 py-4 pr-2 pl-4">
      <BellRing className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-medium text-foreground">Get a notification when someone opens your links</p>
        {n.support === "install" ? (
          <p className="mt-1 text-[0.8125rem] leading-snug text-muted-foreground">
            On iPhone this needs the dashboard on your Home Screen. In Safari, tap Share, then Add to Home Screen, and open it from
            there.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={n.enable} disabled={n.busy}>
              {n.busy ? "Turning on…" : "Turn on"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onShow("settings")}>
              Choose what pings
            </Button>
          </div>
        )}
      </div>
      <Button variant="ghost" size="icon-sm" onClick={dismiss} aria-label="Dismiss" className="text-muted-foreground">
        <X />
      </Button>
    </div>
  );
}
