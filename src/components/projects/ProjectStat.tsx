"use client";

import { useVariantStat } from "@/components/cv/Variant";

type Stat = { value: string; label: string };

/**
 * A project's headline number on the projects page. A tailored link can swap it for the figure of one of
 * the project's chapters (`stats` in the variant), so the number that answers the job comes first.
 * `figures` are the chapters' figures as stats, by chapter id (see `statOf` in src/content/projects.ts).
 */
export function ProjectStat({ slug, stat, figures }: { slug: string; stat: Stat; figures: Record<string, Stat> }) {
  const chosen = useVariantStat(slug);
  const shown = (chosen && figures[chosen]) || stat;
  return (
    <p className="mt-8 flex items-baseline gap-14">
      <span className="font-display text-h4 leading-none font-semibold text-midnight-50 tabular-nums">{shown.value}</span>
      <span className="text-body text-midnight-200">{shown.label}</span>
    </p>
  );
}
