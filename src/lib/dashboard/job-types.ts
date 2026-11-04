/** What a job is, shared by the server (./jobs.ts) and the dashboard's Jobs view. */

export const JOB_STATUSES = ["saved", "applied", "interviewing", "offer", "rejected", "closed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_LABEL: Record<JobStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  closed: "Closed",
};

export type Job = {
  id: string;
  company: string;
  title: string;
  /** The posting. */
  url?: string;
  status: JobStatus;
  /** The day it went out, "2026-11-04". */
  appliedOn?: string;
  /** What was sent with it: "cv:<code>" for a tailored link, "go:<name>" for a short link. */
  links: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
