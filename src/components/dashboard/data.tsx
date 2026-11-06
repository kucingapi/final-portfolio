"use client";

import { createContext, useContext } from "react";
import type { LinkActivity } from "@/lib/cv/store";
import type { ActivityEvent } from "@/lib/dashboard/activity";
import type { Enquiry } from "@/lib/dashboard/enquiries";
import type { Job } from "@/lib/dashboard/job-types";
import type { LinkStats, ShortLink } from "@/lib/dashboard/links";
import { useApi } from "./api";

export type LinkRow = ShortLink & { stats: LinkStats };
export type CvRow = { code: string; label: string; lang?: "en" | "id"; createdAt: string; updatedAt: string; activity: LinkActivity };
export type { ActivityEvent };

type Data = {
  /** Where links point: the public site's address. */
  origin: string;
  /** The masked inbox setup and reset links go to. */
  inbox: string;
  links: ReturnType<typeof useApi<{ links: LinkRow[]; cv: CvRow[] }>>;
  activity: ReturnType<typeof useApi<{ events: ActivityEvent[] }>>;
  /** Contact-form messages, and when the Inbox was last opened. */
  enquiries: ReturnType<typeof useApi<{ enquiries: Enquiry[]; seen: string | null }>>;
  /** Jobs applied to, with the links sent for each. */
  jobs: ReturnType<typeof useApi<{ jobs: Job[] }>>;
};

const DataContext = createContext<Data | null>(null);

/** The links, the feed, the Inbox and the jobs, loaded once for every view and fresh again each time the app comes back. */
export function DashboardData({ origin, inbox, children }: { origin: string; inbox: string; children: React.ReactNode }) {
  const links = useApi<{ links: LinkRow[]; cv: CvRow[] }>("/api/dashboard/links");
  const activity = useApi<{ events: ActivityEvent[] }>("/api/dashboard/activity");
  const enquiries = useApi<{ enquiries: Enquiry[]; seen: string | null }>("/api/dashboard/enquiries");
  const jobs = useApi<{ jobs: Job[] }>("/api/dashboard/jobs");
  return <DataContext.Provider value={{ origin, inbox, links, activity, enquiries, jobs }}>{children}</DataContext.Provider>;
}

export function useDashboard() {
  const data = useContext(DataContext);
  if (!data) throw new Error("useDashboard needs <DashboardData>.");
  return data;
}

/** A tailored link's path, in the language it was made in. */
export const cvPath = (code: string, lang?: string) => `${lang === "id" ? "/id" : "/"}?v=${code}`;

/** The full address of a link, as it's shared. */
export const linkUrl = (origin: string, ref: string, lang?: string) =>
  ref.startsWith("go:") ? `${origin}/go/${ref.slice(3)}` : `${origin}${cvPath(ref.slice(3), lang)}`;
