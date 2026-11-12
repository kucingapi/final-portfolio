"use client";

import { Briefcase, Check, ExternalLink, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { TIME_ZONE } from "@/content/site";
import { JOB_STATUSES, STATUS_LABEL, type Job, type JobStatus } from "@/lib/dashboard/job-types";
import { send } from "./api";
import { type CvRow, type LinkRow, useDashboard } from "./data";
import { ago, count, date } from "./format";
import { Problem } from "./Problem";
import { Button } from "./ui/button";
import { cn } from "./ui/cn";
import { Confirm } from "./ui/confirm";
import { Field, Input } from "./ui/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Skeleton } from "./ui/skeleton";
import { toast } from "./ui/toaster";

/**
 * Jobs applied to, each with its posting, where it stands, and what was sent with it: tailored CV links
 * and short links, with their opens, downloads and clicks added up. A tailored link that isn't in a job
 * yet can become one in a tap; agents record jobs themselves when they make a tailored link.
 */

type LinksData = { links: LinkRow[]; cv: CvRow[] };
type Totals = { opens: number; cv: number; portfolio: number; rates: number; clicks: number; last?: string };

const ACTIVE: JobStatus[] = ["saved", "applied", "interviewing", "offer"];
type Filter = "active" | "closed" | "all";

const DOT: Record<JobStatus, string> = {
  saved: "bg-muted-foreground/60",
  applied: "bg-primary",
  interviewing: "bg-amber-300",
  offer: "bg-emerald-300",
  rejected: "bg-destructive",
  closed: "bg-muted-foreground/60",
};

function totalsFor(refs: string[], data: LinksData | null): Totals {
  const t: Totals = { opens: 0, cv: 0, portfolio: 0, rates: 0, clicks: 0 };
  const later = (at?: string) => {
    if (at && (!t.last || at > t.last)) t.last = at;
  };
  for (const ref of refs) {
    const id = ref.slice(3);
    if (ref.startsWith("cv:")) {
      const a = data?.cv.find((c) => c.code === id)?.activity;
      if (!a) continue;
      t.opens += a.opens;
      t.cv += a.cv;
      t.portfolio += a.portfolio;
      t.rates += a.rates;
      later(a.lastOpen);
    } else {
      const s = data?.links.find((l) => l.name === id)?.stats;
      if (!s) continue;
      t.clicks += s.total;
      later(s.lastClick);
    }
  }
  return t;
}

/** "3 opens · 1 CV download · 2 clicks", or that nothing has happened yet. */
function summary(t: Totals) {
  const parts = [
    t.opens && count(t.opens, "open"),
    t.cv && count(t.cv, "CV download"),
    t.portfolio && count(t.portfolio, "deck download"),
    t.rates && count(t.rates, "rate card download"),
    t.clicks && count(t.clicks, "click"),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Not opened yet";
}

/** "Hubble, Software Engineer (Front-End), 2026-11" → company and role, to start a job from a tailored link. */
function fromLabel(label: string) {
  const [company = "", title = ""] = label.split(",").map((s) => s.trim());
  return { company, title: /^\d{4}-\d{2}$/.test(title) ? "" : title };
}

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());

export function JobsView({ open, onOpen, onClose }: { open: string | null; onOpen: (target: string) => void; onClose: () => void }) {
  const { jobs, links } = useDashboard();
  const [filter, setFilter] = useState<Filter>("active");
  const list = jobs.data?.jobs;

  const sorted = useMemo(
    () => (list ? [...list].sort((a, b) => (b.appliedOn ?? b.createdAt).localeCompare(a.appliedOn ?? a.createdAt)) : null),
    [list],
  );
  const loose = useMemo(() => {
    if (!list || !links.data) return [];
    const used = new Set(list.flatMap((j) => j.links));
    return links.data.cv.filter((c) => !used.has(`cv:${c.code}`));
  }, [list, links.data]);

  if (!sorted) return jobs.error ? <Problem message={jobs.error} onRetry={jobs.reload} /> : <ListSkeleton />;

  const active = sorted.filter((j) => ACTIVE.includes(j.status));
  const filters: { id: Filter; label: string; n: number }[] = [
    { id: "active", label: "Open", n: active.length },
    { id: "closed", label: "Closed", n: sorted.length - active.length },
    { id: "all", label: "All", n: sorted.length },
  ];
  const shown = filter === "all" ? sorted : filter === "active" ? active : sorted.filter((j) => !ACTIVE.includes(j.status));

  return (
    <div className="flex flex-col gap-6">
      {sorted.length > 0 && (
        <div role="group" aria-label="Show" className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground aria-pressed:border-transparent aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {f.label}
              <span className="tabular-nums opacity-70">{f.n}</span>
            </button>
          ))}
        </div>
      )}

      {shown.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {shown.map((job) => (
            <JobRow key={job.id} job={job} totals={totalsFor(job.links, links.data)} onOpen={() => onOpen(job.id)} />
          ))}
        </ul>
      ) : (
        <Empty any={sorted.length > 0} onNew={() => onOpen("new")} />
      )}

      {loose.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Tailored links not in a job yet</h2>
            <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted-foreground">Make each a job to keep its posting and status beside its opens.</p>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {loose.map((c) => (
              <li key={c.code} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-foreground">{c.label}</span>
                  <span className="block text-[0.8125rem] text-muted-foreground">
                    {summary({ opens: c.activity.opens, cv: c.activity.cv, portfolio: c.activity.portfolio, rates: c.activity.rates, clicks: 0 })}
                  </span>
                </span>
                <Button size="sm" variant="secondary" onClick={() => onOpen(`new~cv:${c.code}`)}>
                  Make it a job
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <JobSheet open={open} onClose={onClose} />
    </div>
  );
}

function StatusChip({ status }: { status: JobStatus }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <span aria-hidden className={cn("size-1.5 rounded-full", DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** "1 CV link · 2 short links": what went out with the job. */
function sent(refs: string[]) {
  const cv = refs.filter((r) => r.startsWith("cv:")).length;
  const go = refs.length - cv;
  return [cv && count(cv, "CV link"), go && count(go, "short link")].filter(Boolean).join(" · ") || "No links yet";
}

function JobRow({ job, totals, onOpen }: { job: Job; totals: Totals; onOpen: () => void }) {
  const meta = [sent(job.links), summary(totals), totals.last && `last ${ago(totals.last)}`, job.appliedOn && `applied ${date(job.appliedOn)}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="flex items-start gap-1 pr-2 transition-colors duration-150 hover:bg-accent">
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 px-4 py-3.5 text-left">
        <span className="flex items-center gap-2">
          <span className="min-w-0 truncate text-[0.9375rem] font-semibold text-foreground">{job.company}</span>
          <StatusChip status={job.status} />
        </span>
        <span className="mt-0.5 block truncate text-sm text-foreground/85">{job.title}</span>
        <span className="mt-1 block text-[0.8125rem] text-muted-foreground">{meta}</span>
      </button>
      {job.url && (
        <Button asChild variant="ghost" size="icon-sm" className="mt-3">
          <a href={job.url} target="_blank" rel="noopener noreferrer" aria-label={`The ${job.company} posting`}>
            <ExternalLink />
          </a>
        </Button>
      )}
    </li>
  );
}

function Empty({ any, onNew }: { any: boolean; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <Briefcase className="size-6 text-muted-foreground" />
      <p className="font-semibold text-foreground">{any ? "Nothing here" : "No jobs yet"}</p>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        {any
          ? "Jobs with this status show up here."
          : "Add the jobs you apply to, with the links you sent. The CV tool adds them too when it makes a tailored link."}
      </p>
      {!any && (
        <Button variant="secondary" onClick={onNew}>
          New job
        </Button>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

/* ── One job: new or edit ─────────────────────────────────────────────── */

function JobSheet({ open, onClose }: { open: string | null; onClose: () => void }) {
  // Keep the panel's content while it slides away.
  const [shown, setShown] = useState(open);
  if (open && open !== shown) setShown(open);
  return (
    <Sheet open={Boolean(open)} onOpenChange={(next) => !next && onClose()}>
      <SheetContent>{shown && <JobPanel key={shown} target={shown} onDone={onClose} />}</SheetContent>
    </Sheet>
  );
}

function JobPanel({ target, onDone }: { target: string; onDone: () => void }) {
  const { jobs, links } = useDashboard();
  if (target.startsWith("new")) {
    const ref = target.split("~")[1];
    const cv = ref ? links.data?.cv.find((c) => `cv:${c.code}` === ref) : undefined;
    return <JobForm start={{ ...(cv ? fromLabel(cv.label) : {}), links: ref ? [ref] : [] }} onDone={onDone} />;
  }
  if (!jobs.data) return <Skeleton className="m-5 h-40 rounded-xl" />;
  const job = jobs.data.jobs.find((j) => j.id === target);
  if (!job) {
    return (
      <SheetHeader>
        <SheetTitle>This job is gone</SheetTitle>
        <SheetDescription>It was deleted, so there&apos;s nothing more to show.</SheetDescription>
      </SheetHeader>
    );
  }
  return <JobForm job={job} onDone={onDone} />;
}

function JobForm({ job, start, onDone }: { job?: Job; start?: Partial<Job>; onDone: () => void }) {
  const { jobs, links } = useDashboard();
  const from = job ?? start ?? {};
  const [company, setCompany] = useState(from.company ?? "");
  const [title, setTitle] = useState(from.title ?? "");
  const [url, setUrl] = useState(from.url ?? "");
  const [status, setStatus] = useState<JobStatus>(from.status ?? "applied");
  const [appliedOn, setAppliedOn] = useState(job ? (job.appliedOn ?? "") : today());
  const [picked, setPicked] = useState<string[]>(from.links ?? []);
  const [notes, setNotes] = useState(from.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const totals = totalsFor(picked, links.data);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const body = { company, title, url, status, appliedOn, links: picked, notes };
    try {
      if (job) await send(`/api/dashboard/jobs/${job.id}`, "PATCH", body);
      else await send("/api/dashboard/jobs", "POST", body);
      await jobs.reload();
      toast.success(job ? "Saved." : "Job added.");
      onDone();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!job) return;
    setBusy(true);
    try {
      await send(`/api/dashboard/jobs/${job.id}`, "DELETE");
      await jobs.reload();
      toast.success("Job deleted.");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{job ? job.company : "New job"}</SheetTitle>
        <SheetDescription>
          {job ? `${job.title} · ${summary(totals)}${totals.last ? `, last ${ago(totals.last)}` : ""}` : "A job you applied to, with the links you sent."}
        </SheetDescription>
      </SheetHeader>
      <form onSubmit={save} className="contents">
        <SheetBody className="gap-5">
          {job?.url && (
            <Button asChild variant="secondary" className="self-start">
              <a href={job.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                Open the posting
              </a>
            </Button>
          )}
          <Field label="Company" htmlFor="job-company">
            <Input id="job-company" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="off" required />
          </Field>
          <Field label="Role" htmlFor="job-title">
            <Input id="job-title" value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" required />
          </Field>
          <Field label="Job posting" htmlFor="job-url" hint="The link to the posting.">
            <Input id="job-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" autoComplete="off" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status" htmlFor="job-status">
              <select
                id="job-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as JobStatus)}
                className="h-11 w-full rounded-lg border border-input bg-muted px-3 text-base text-foreground focus:border-primary md:text-sm"
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Applied on" htmlFor="job-date">
              <Input id="job-date" type="date" value={appliedOn} onChange={(e) => setAppliedOn(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Sent with it</span>
            <LinkPicker value={picked} onChange={setPicked} />
          </div>
          <Field label="Notes" htmlFor="job-notes" hint="Private.">
            <textarea
              id="job-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="field-sizing-content min-h-20 w-full rounded-lg border border-input bg-muted px-3.5 py-2.5 text-base leading-relaxed text-foreground focus:border-primary md:text-sm"
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={busy || !company.trim() || !title.trim()}>
            {busy ? "Saving…" : job ? "Save" : "Add job"}
          </Button>
          {job && (
            <Button type="button" variant="destructive" className="self-start" onClick={() => setAsking(true)} disabled={busy}>
              <Trash2 />
              Delete job
            </Button>
          )}
        </SheetBody>
      </form>
      {job && (
        <Confirm
          open={asking}
          onOpenChange={setAsking}
          title="Delete this job?"
          description="The links you sent with it stay; only the job and its notes go."
          action={busy ? "Deleting…" : "Delete"}
          busy={busy}
          destructive
          onConfirm={remove}
        />
      )}
    </>
  );
}

/** Tick the links that went out with the job; each shows its own opens or clicks. */
function LinkPicker({ value, onChange }: { value: string[]; onChange: (refs: string[]) => void }) {
  const { links } = useDashboard();
  const data = links.data;
  if (!data) return <Skeleton className="h-24 rounded-xl" />;

  const options = [
    ...data.cv.map((c) => ({
      ref: `cv:${c.code}`,
      name: c.label,
      sub: `Tailored link · ${summary({ opens: c.activity.opens, cv: c.activity.cv, portfolio: c.activity.portfolio, rates: c.activity.rates, clicks: 0 })}`,
    })),
    ...data.links.map((l) => ({
      ref: `go:${l.name}`,
      name: `/go/${l.name}`,
      sub: `Short link · ${l.stats?.total ? count(l.stats.total, "click") : "Not clicked yet"}`,
    })),
  ];
  // Links attached earlier and since deleted stay listed, so they can be taken off.
  for (const ref of value) if (!options.some((o) => o.ref === ref)) options.push({ ref, name: ref.slice(3), sub: "Deleted link" });
  if (!options.length) return <p className="text-sm text-muted-foreground">No links yet. Make a short link, or a tailored CV link with the CV tool.</p>;

  return (
    <div role="group" aria-label="Sent with it" className="max-h-72 overflow-y-auto rounded-xl border border-border">
      {options.map((o) => {
        const on = value.includes(o.ref);
        return (
          <button
            key={o.ref}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((r) => r !== o.ref) : [...value, o.ref])}
            className="flex w-full items-center gap-3 border-b border-border px-3.5 py-2.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-accent"
          >
            <span
              aria-hidden
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-md border transition-colors duration-150",
                on ? "border-primary bg-primary text-primary-foreground" : "border-input",
              )}
            >
              {on && <Check className="size-3.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-foreground">{o.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{o.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
