"use client";

import { useMemo, useState } from "react";
import { TIME_ZONE } from "@/content/site";
import { cn } from "./ui/cn";

const DAYS = 30;
const W = 600;
const H = 120;
const GAP = 3;

const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const dayLabel = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Clicks per day over the last 30 days (Jakarta time), one bar a day; touch or hover a day for its count. */
export function ClicksChart({ days }: { days: Record<string, number> }) {
  const [active, setActive] = useState<number | null>(null);
  const [now] = useState(() => Date.now());
  const series = useMemo(() => {
    return Array.from({ length: DAYS }, (_, i) => {
      const key = dayKey(new Date(now - (DAYS - 1 - i) * 86_400_000));
      return { key, count: days[key] ?? 0 };
    });
  }, [days, now]);
  const max = Math.max(1, ...series.map((d) => d.count));
  const total = series.reduce((n, d) => n + d.count, 0);
  const slot = W / DAYS;
  const shown = active === null ? null : series[active];

  // One handler for mouse, pen and finger: the column under the pointer is the active day.
  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setActive(Math.min(DAYS - 1, Math.max(0, Math.floor(((e.clientX - box.left) / box.width) * DAYS))));
  };

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
        <span className="text-muted-foreground">Clicks per day, last 30 days</span>
        <span aria-live="polite" className="font-medium text-foreground tabular-nums">
          {shown ? `${dayLabel(shown.key)}: ${shown.count}` : `${total} in all`}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y"
        role="img"
        aria-label={`Clicks per day for the last ${DAYS} days: ${total} in all.`}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setActive(null)}
      >
        <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} stroke="currentColor" className="text-border" />
        {series.map((d, i) => {
          const h = d.count ? Math.max(4, (d.count / max) * (H - 8)) : 0;
          const x = i * slot + GAP / 2;
          const w = slot - GAP;
          const r = Math.min(4, w / 2, h);
          const y = H - h;
          return (
            <g key={d.key}>
              {active === i && <rect x={i * slot} y={0} width={slot} height={H} rx={3} className="fill-foreground/[0.06]" />}
              {h > 0 && (
                <path
                  d={`M${x},${H} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${H} Z`}
                  className={cn(active === i ? "fill-foreground" : "fill-primary")}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{dayLabel(series[0].key)}</span>
        <span>Today</span>
      </div>
    </figure>
  );
}
