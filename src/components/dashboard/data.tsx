"use client";

import { createContext, useContext } from "react";
import type { LinkActivity } from "@/lib/cv/store";
import type { ActivityEvent } from "@/lib/dashboard/activity";
import type { LinkStats, ShortLink } from "@/lib/dashboard/links";
import { useApi } from "./api";

export type LinkRow = ShortLink & { stats: LinkStats };
export type CvRow = { code: string; label: string; createdAt: string; updatedAt: string; activity: LinkActivity };
export type { ActivityEvent };

type Data = {
  /** Where links point: the public site's address. */
  origin: string;
  /** The masked inbox setup and reset links go to. */
  inbox: string;
  links: ReturnType<typeof useApi<{ links: LinkRow[]; cv: CvRow[] }>>;
  activity: ReturnType<typeof useApi<{ events: ActivityEvent[] }>>;
};

const DataContext = createContext<Data | null>(null);

/** The links and the feed, loaded once for every view and fresh again each time the app comes back. */
export function DashboardData({ origin, inbox, children }: { origin: string; inbox: string; children: React.ReactNode }) {
  const links = useApi<{ links: LinkRow[]; cv: CvRow[] }>("/api/dashboard/links");
  const activity = useApi<{ events: ActivityEvent[] }>("/api/dashboard/activity");
  return <DataContext.Provider value={{ origin, inbox, links, activity }}>{children}</DataContext.Provider>;
}

export function useDashboard() {
  const data = useContext(DataContext);
  if (!data) throw new Error("useDashboard needs <DashboardData>.");
  return data;
}

/** The full address of a link, as it's shared. */
export const linkUrl = (origin: string, ref: string) =>
  ref.startsWith("go:") ? `${origin}/go/${ref.slice(3)}` : `${origin}/?v=${ref.slice(3)}`;
