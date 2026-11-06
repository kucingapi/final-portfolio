"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadTranslationRows } from "@/app/dashboard/content-actions";
import type { TranslationRow } from "@/lib/content/translations";
import { Button } from "../ui/button";
import { cn } from "../ui/cn";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { toast } from "../ui/toaster";

/**
 * The Bahasa Indonesia translation, line by line: every English string of the site, the CV and the projects,
 * with its Bahasa beside it. A line left empty shows in English on /id. Only the words translate here: ids,
 * links, images and the order always follow the English documents.
 */

type Row = Omit<TranslationRow, "id">;
type Value = { strings: Record<string, string> };
type Show = "missing" | "all";
type Doc = "all" | Row["doc"];

const DOCS: { id: Doc; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "site", label: "Site" },
  { id: "cv", label: "CV" },
  { id: "projects", label: "Projects" },
];
const PAGE = 40;

const has = (strings: Record<string, string>, en: string) => Boolean(strings[en]?.trim());

export function Translations({ value, onChange }: { value: unknown; onChange: (next: Value) => void }) {
  const current = value as Value;
  const strings = current.strings;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [show, setShow] = useState<Show>("missing");
  const [doc, setDoc] = useState<Doc>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  // Which lines were missing when the list was last filtered: typing into one doesn't make it jump away.
  const [missingAt, setMissingAt] = useState<Set<string> | null>(null);
  const latest = useRef(strings);
  useEffect(() => {
    latest.current = strings;
  });

  useEffect(() => {
    let alive = true;
    loadTranslationRows().then((result) => {
      if (!alive) return;
      if (!result.ok) return toast.error(result.error);
      setRows(result.rows);
      const missing = new Set(result.rows.filter((r) => !has(latest.current, r.en)).map((r) => r.en));
      setMissingAt(missing);
      if (!missing.size) setShow("all");
    });
    return () => {
      alive = false;
    };
  }, []);

  const refilter = () => {
    if (rows) setMissingAt(new Set(rows.filter((r) => !has(strings, r.en)).map((r) => r.en)));
    setLimit(PAGE);
  };

  const shown = useMemo(() => {
    if (!rows || !missingAt) return [];
    const words = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (doc === "all" || r.doc === doc) &&
        (show === "all" || missingAt.has(r.en)) &&
        (!words || r.en.toLowerCase().includes(words) || (strings[r.en] ?? "").toLowerCase().includes(words) || r.where.toLowerCase().includes(words)),
    );
  }, [rows, missingAt, doc, show, query, strings]);

  if (!rows) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  const done = rows.filter((r) => has(strings, r.en)).length;
  const set = (en: string, id: string) => onChange({ ...current, strings: { ...strings, [en]: id } });

  return (
    <section aria-label="Bahasa Indonesia" className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="font-semibold text-foreground">
          {done} of {rows.length} lines in Bahasa
        </p>
        <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(done / rows.length) * 100}%` }} />
        </div>
        <p className="mt-3 text-[0.8125rem] leading-snug text-muted-foreground">
          The site in Bahasa Indonesia (/id) reads these. An empty line shows in English. Only the words change here: ids, links,
          images and order follow the English documents, and a line whose English changes shows in English until it is translated
          again. Dates and testimonials are left as they are.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {(["missing", "all"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={show === s}
              onClick={() => {
                setShow(s);
                refilter();
              }}
              className="h-9 rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground aria-pressed:border-transparent aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {s === "missing" ? `Not translated (${rows.length - done})` : "All lines"}
            </button>
          ))}
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {DOCS.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={doc === d.id}
              onClick={() => {
                setDoc(d.id);
                refilter();
              }}
              className="h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground"
            >
              {d.label}
            </button>
          ))}
        </div>
        <label className="relative block">
          <span className="sr-only">Search the lines</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search English or Bahasa"
            className="pl-10"
          />
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {show === "missing" && !query ? "Every line here is translated." : "No line matches."}
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {shown.slice(0, limit).map((r) => {
            const id = `tr-${r.doc}-${r.path}`;
            const empty = !has(strings, r.en);
            return (
              <li key={r.en} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{DOCS.find((d) => d.id === r.doc)?.label}</p>
                <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">{r.where}</p>
                <p lang="en" className="mt-3 text-sm leading-relaxed text-foreground/80">
                  {r.en}
                </p>
                <label htmlFor={id} className="sr-only">
                  Bahasa Indonesia
                </label>
                <textarea
                  id={id}
                  lang="id"
                  value={strings[r.en] ?? ""}
                  rows={r.en.length > 90 ? 3 : 1}
                  placeholder="Not translated: shows in English"
                  onChange={(e) => set(r.en, e.target.value)}
                  className={cn(
                    "field-sizing-content mt-2 w-full rounded-lg border bg-muted px-3.5 py-2.5 text-base leading-relaxed text-foreground transition-colors duration-150 placeholder:text-muted-foreground/60 focus:border-primary md:text-sm",
                    empty ? "border-dashed border-input" : "border-input",
                  )}
                />
              </li>
            );
          })}
        </ol>
      )}
      {shown.length > limit && (
        <Button variant="secondary" className="self-center" onClick={() => setLimit((n) => n + PAGE)}>
          Show {Math.min(PAGE, shown.length - limit)} more of {shown.length - limit}
        </Button>
      )}
    </section>
  );
}
