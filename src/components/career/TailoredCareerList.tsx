"use client";

import { useEffect, useMemo } from "react";
import { useVariant } from "@/components/cv/Variant";
import { useLang, useNames } from "@/lib/i18n/client";
import { localizeVariant } from "@/lib/cv/variant";
import { ScrollTrigger } from "@/lib/gsap";
import type { CareerRole } from "@/content/site";
import { tailorRoles, type RoleLines } from "@/lib/cv/career";
import { CareerList } from "./CareerList";

/**
 * A career list as this visitor should read it. Without a tailored link it is the list as written; with
 * one, roles that stand for a CV entry take the variant's title and lines for it and lead in the CV's
 * order (see src/lib/cv/career.ts). `links` is each role's CV entry, `lines` what those entries offer.
 * `summary` lists (the home page) keep each role as short as it usually is.
 */
export function TailoredCareerList({
  roles,
  links,
  lines,
  summary = false,
  className,
}: {
  roles: CareerRole[];
  links: (string | null)[];
  lines: RoleLines;
  summary?: boolean;
  className?: string;
}) {
  // The variant names titles in English; on a Bahasa page, `lines` hold the Bahasa ones.
  const raw = useVariant().current?.variant;
  const lang = useLang();
  const names = useNames();
  const variant = useMemo(() => localizeVariant(raw, lang, names), [raw, lang, names]);
  const shown = useMemo(() => (variant ? tailorRoles(roles, links, lines, variant, summary) : roles), [roles, links, lines, variant, summary]);
  const key = shown.map((r) => `${r.org}|${r.period}|${r.role}|${r.points.length}`).join(" ");

  // Reordered or longer rows move what is below them: measure the scroll reveals again.
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [key]);

  return <CareerList roles={shown} className={className} />;
}
