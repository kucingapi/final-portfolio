import { getActivity, type LinkActivity } from "@/lib/cv/store";
import { JOB_STATUSES, type Job, type JobStatus } from "./job-types";
import { getStats } from "./links";
import { getValue, setValue } from "./state";

export { JOB_STATUSES, type Job, type JobStatus } from "./job-types";

/**
 * Jobs applied to (or kept to apply to): the posting, where it stands, and the links sent with it, so
 * the dashboard and agents can add up how often each was opened. All of them in one record, Upstash in
 * production and .data/dashboard.json in development. Server only.
 */

export type JobInput = Partial<Pick<Job, "company" | "title" | "url" | "status" | "appliedOn" | "links" | "notes">>;

export class JobError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const KEY = "dash:jobs";
const REF = /^(cv|go):[A-Za-z0-9_-]{1,64}$/;

export const listJobs = async () => (await getValue<Job[]>(KEY)) ?? [];

/** Today in Jakarta, for "applied on". */
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

function clean(input: JobInput, base?: Job): Omit<Job, "id" | "createdAt" | "updatedAt"> {
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
  const pick = <T>(given: T | undefined, current: T | undefined) => (given === undefined ? current : given);

  const company = pick(text(input.company, 120), base?.company) ?? "";
  const title = pick(text(input.title, 160), base?.title) ?? "";
  if (!company) throw new JobError("Which company is it?");
  if (!title) throw new JobError("What's the role?");

  const url = input.url === undefined ? base?.url : text(input.url, 2000) || undefined;
  if (url && !/^https?:\/\/\S+$/i.test(url)) throw new JobError("The posting must be a full link (https://…).");

  const status = input.status ?? base?.status ?? "applied";
  if (!JOB_STATUSES.includes(status)) throw new JobError(`The status must be one of: ${JOB_STATUSES.join(", ")}.`);

  const appliedOn = input.appliedOn === undefined ? base?.appliedOn : text(input.appliedOn, 10) || undefined;
  if (appliedOn && !/^\d{4}-\d{2}-\d{2}$/.test(appliedOn)) throw new JobError("The date must look like 2026-11-04.");

  const links = input.links === undefined ? (base?.links ?? []) : [...new Set(input.links.filter((r) => typeof r === "string" && REF.test(r)))];
  const notes = input.notes === undefined ? base?.notes : text(input.notes, 2000) || undefined;
  return { company, title, url, status, appliedOn, links, notes };
}

export async function createJob(input: JobInput): Promise<Job> {
  const now = new Date().toISOString();
  const job: Job = { id: crypto.randomUUID().slice(0, 8), ...clean(input), createdAt: now, updatedAt: now };
  await setValue(KEY, [job, ...(await listJobs())]);
  return job;
}

export async function updateJob(id: string, input: JobInput): Promise<Job> {
  const all = await listJobs();
  const at = all.findIndex((j) => j.id === id);
  if (at < 0) throw new JobError("That job is gone.", 404);
  const job: Job = { ...all[at], ...clean(input, all[at]), updatedAt: new Date().toISOString() };
  all[at] = job;
  await setValue(KEY, all);
  return job;
}

export async function deleteJob(id: string) {
  const all = await listJobs();
  const next = all.filter((j) => j.id !== id);
  if (next.length === all.length) return false;
  await setValue(KEY, next);
  return true;
}

const samePosting = (a: string, b: string) => a.replace(/[?#].*$/, "").replace(/\/$/, "") === b.replace(/[?#].*$/, "").replace(/\/$/, "");

/**
 * Record that a tailored link went out for a job: added to the job with the same posting link, or to a
 * new one. For agents, which save the tailored link and the job in one go.
 */
export async function recordApplication(code: string, job: { company: string; title: string; url?: string; status?: JobStatus }) {
  const ref = `cv:${code}`;
  const existing = job.url ? (await listJobs()).find((j) => j.url && samePosting(j.url, job.url!)) : undefined;
  if (existing) return updateJob(existing.id, { links: [...existing.links, ref], status: job.status });
  return createJob({ ...job, links: [ref], appliedOn: today(), status: job.status ?? "applied" });
}

export type JobTotals = { opens: number; cv: number; portfolio: number; clicks: number; last?: string };

/** How often everything sent with each job was opened, for agents (the dashboard adds it up itself). */
export async function withTotals(jobs: Job[]) {
  const codes = [...new Set(jobs.flatMap((j) => j.links.filter((r) => r.startsWith("cv:")).map((r) => r.slice(3))))];
  const names = [...new Set(jobs.flatMap((j) => j.links.filter((r) => r.startsWith("go:")).map((r) => r.slice(3))))];
  const [activity, stats] = await Promise.all([Promise.all(codes.map((c) => getActivity(c))), getStats(names)]);
  const byCode = new Map<string, LinkActivity>(codes.map((c, i) => [c, activity[i]]));
  return jobs.map((job) => {
    const totals: JobTotals = { opens: 0, cv: 0, portfolio: 0, clicks: 0 };
    const later = (at?: string) => {
      if (at && (!totals.last || at > totals.last)) totals.last = at;
    };
    for (const ref of job.links) {
      const id = ref.slice(3);
      if (ref.startsWith("cv:")) {
        const a = byCode.get(id);
        if (!a) continue;
        totals.opens += a.opens;
        totals.cv += a.cv;
        totals.portfolio += a.portfolio;
        later(a.lastOpen);
      } else {
        const s = stats[id];
        if (!s) continue;
        totals.clicks += s.total;
        later(s.lastClick);
      }
    }
    return { ...job, totals };
  });
}
