"use client";

import { FileText, Link2 } from "lucide-react";
import { useMemo, useState } from "react";
import { type CvRow, type LinkRow, cvPath, useDashboard } from "./data";
import { ago, bare, count } from "./format";
import { Problem } from "./Problem";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

type Row = { kind: "go"; at: string; link: LinkRow } | { kind: "cv"; at: string; cv: CvRow };
type Filter = "all" | "go" | "cv";

/** Short links and tailored CV links in one list, newest first. */
export function LinksView({ onOpen }: { onOpen: (ref: string) => void }) {
  const { links } = useDashboard();
  const [filter, setFilter] = useState<Filter>("all");
  const rows = useMemo<Row[] | null>(() => {
    if (!links.data) return null;
    const all: Row[] = [
      ...links.data.links.map((link) => ({ kind: "go" as const, at: link.createdAt, link })),
      ...links.data.cv.map((cv) => ({ kind: "cv" as const, at: cv.createdAt, cv })),
    ];
    return all.sort((a, b) => b.at.localeCompare(a.at));
  }, [links.data]);

  if (!rows) return links.error ? <Problem message={links.error} onRetry={links.reload} /> : <ListSkeleton />;

  const filters: { id: Filter; label: string; n: number }[] = [
    { id: "all", label: "All", n: rows.length },
    { id: "go", label: "Short links", n: rows.filter((r) => r.kind === "go").length },
    { id: "cv", label: "CV links", n: rows.filter((r) => r.kind === "cv").length },
  ];
  const shown = rows.filter((r) => filter === "all" || r.kind === filter);

  return (
    <div className="flex flex-col gap-5">
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

      {shown.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {shown.map((row) =>
            row.kind === "go" ? (
              <GoRow key={`go:${row.link.name}`} link={row.link} onOpen={onOpen} />
            ) : (
              <CvRowItem key={`cv:${row.cv.code}`} cv={row.cv} onOpen={onOpen} />
            ),
          )}
        </ul>
      ) : (
        <Empty filter={filter} onNew={() => onOpen("new")} />
      )}
    </div>
  );
}

function Item({
  icon: Icon,
  title,
  detail,
  figure,
  when,
  onClick,
}: {
  icon: typeof Link2;
  title: string;
  detail: string;
  figure: string;
  when: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-accent/60 active:bg-accent"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
          <Icon className="size-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-medium text-foreground">{title}</span>
          <span className="mt-0.5 block truncate text-[0.8125rem] text-muted-foreground">{detail}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="text-sm font-semibold text-foreground tabular-nums">{figure}</span>
          <span className="text-xs text-muted-foreground">{when}</span>
        </span>
      </button>
    </li>
  );
}

function GoRow({ link, onOpen }: { link: LinkRow; onOpen: (ref: string) => void }) {
  return (
    <Item
      icon={Link2}
      title={`/go/${link.name}`}
      detail={link.note || bare(link.url)}
      figure={count(link.stats.total, "click")}
      when={link.stats.lastClick ? ago(link.stats.lastClick) : "no clicks yet"}
      onClick={() => onOpen(`go:${link.name}`)}
    />
  );
}

function CvRowItem({ cv, onOpen }: { cv: CvRow; onOpen: (ref: string) => void }) {
  const a = cv.activity;
  return (
    <Item
      icon={FileText}
      title={cv.label}
      detail={`${cvPath(cv.code, cv.lang)} · ${a.cv} CV, ${a.portfolio} portfolio${a.rateViews || a.rates ? `, ${a.rateViews} rate card views, ${a.rates} rate card PDF` : ""}`}
      figure={count(a.opens, "open")}
      when={a.lastOpen ? ago(a.lastOpen) : "not opened yet"}
      onClick={() => onOpen(`cv:${cv.code}`)}
    />
  );
}

function Empty({ filter, onNew }: { filter: Filter; onNew: () => void }) {
  const cv = filter === "cv";
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
      <p className="text-[0.9375rem] font-medium text-foreground">{cv ? "No tailored CV links yet" : "No short links yet"}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {cv
          ? "Tailored links are made through the novel-cv MCP. Each one shows up here with its opens and downloads."
          : "A short link like /go/upwork points anywhere and counts who opens it. You can change where it goes later."}
      </p>
      {!cv && (
        <Button className="mt-5" onClick={onNew}>
          New short link
        </Button>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        {[16, 28, 24].map((w) => (
          <Skeleton key={w} className="h-9 rounded-full" style={{ width: `${w * 0.25}rem` }} />
        ))}
      </div>
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
