"use client";

import { useMemo, useState } from "react";
import { site } from "@/content/site";

const DAYS = 30;
const W = 600;
const H = 120;
const GAP = 2;

const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: site.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const dayLabel = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Clicks per day over the last 30 days (Jakarta time), one bar a day, with the count on hover. */
export function ClicksChart({ days }: { days: Record<string, number> }) {
  const [hover, setHover] = useState<number | null>(null);
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
  const shown = hover === null ? null : series[hover];

  return (
    <figure className="flex flex-col gap-8">
      <figcaption className="flex justify-between text-chip text-midnight-200">
        <span>Clicks per day, last 30 days ({total})</span>
        <span aria-live="polite" className="text-midnight-50">
          {shown ? `${dayLabel(shown.key)}: ${shown.count} click${shown.count === 1 ? "" : "s"}` : `peak ${total ? max : 0} a day`}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Clicks per day for the last ${DAYS} days: ${total} in all.`}
        onMouseLeave={() => setHover(null)}
      >
        <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} stroke="currentColor" className="text-midnight-900" />
        {series.map((d, i) => {
          const h = d.count ? Math.max(4, (d.count / max) * (H - 8)) : 0;
          const x = i * slot + GAP / 2;
          const w = slot - GAP;
          const r = Math.min(4, w / 2, h);
          const y = H - h;
          return (
            <g key={d.key} onMouseEnter={() => setHover(i)}>
              {/* The hit target is the whole column, not just the bar. */}
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${H} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${H} Z`}
                  className={hover === i ? "fill-midnight-200" : "fill-midnight-400"}
                />
              )}
              <title>{`${dayLabel(d.key)}: ${d.count}`}</title>
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between text-chip text-midnight-200">
        <span>{dayLabel(series[0].key)}</span>
        <span>Today</span>
      </div>
    </figure>
  );
}
