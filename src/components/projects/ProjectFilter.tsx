"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { CONTEXTS, PLATFORMS, type Context, type Platform } from "@/content/projects";

/**
 * Search and filters for the projects index. The page stays a server component: it passes each
 * project's searchable text and tags here, plus the rendered rows, and this decides which rows
 * show. Rows are hidden rather than unmounted so their scroll reveals and hover state survive.
 */

export type FilterMeta = { slug: string; text: string; platform: Platform; context: Context };

type State = {
  query: string;
  platform: Platform | null;
  context: Context | null;
  visible: Set<string>;
  total: number;
  setQuery: (q: string) => void;
  setPlatform: (p: Platform | null) => void;
  setContext: (c: Context | null) => void;
  reset: () => void;
};

const FilterContext = createContext<State | null>(null);

const useFilter = () => {
  const state = useContext(FilterContext);
  if (!state) throw new Error("Project filter parts must sit inside <ProjectFilterProvider>.");
  return state;
};

/** Lower-case, drop accents and punctuation, so "jetpack-compose" finds "Jetpack Compose". */
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.+#]+/g, " ");

export function ProjectFilterProvider({ items, children }: { items: FilterMeta[]; children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [context, setContext] = useState<Context | null>(null);

  // Start from the URL, so a filtered view can be shared or reloaded. Read it once: the effect
  // below rewrites the URL, and a second read (Strict Mode runs effects twice) would see it empty.
  const read = useRef(false);
  useEffect(() => {
    if (read.current) return;
    read.current = true;
    const params = new URLSearchParams(window.location.search);
    const p = params.get("platform");
    const c = params.get("context");
    setQuery(params.get("q") ?? "");
    setPlatform(PLATFORMS.find((x) => x === p) ?? null);
    setContext(CONTEXTS.find((x) => x === c) ?? null);
  }, []);

  const haystacks = useMemo(() => new Map(items.map((i) => [i.slug, fold(i.text)])), [items]);

  const visible = useMemo(() => {
    const words = fold(query).split(" ").filter(Boolean);
    return new Set(
      items
        .filter((i) => (!platform || i.platform === platform) && (!context || i.context === context))
        .filter((i) => words.every((w) => haystacks.get(i.slug)!.includes(w)))
        .map((i) => i.slug),
    );
  }, [items, haystacks, query, platform, context]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (platform) params.set("platform", platform);
    if (context) params.set("context", context);
    const search = params.toString();
    window.history.replaceState(window.history.state, "", search ? `?${search}` : window.location.pathname);
    // Rows above moved, so every scroll reveal below needs its start point measured again.
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [query, platform, context]);

  const state: State = {
    query,
    platform,
    context,
    visible,
    total: items.length,
    setQuery,
    setPlatform,
    setContext,
    reset: () => {
      setQuery("");
      setPlatform(null);
      setContext(null);
    },
  };
  return <FilterContext.Provider value={state}>{children}</FilterContext.Provider>;
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`inline-flex h-40 items-center rounded-full border-2 px-18 font-inter text-chip font-medium tracking-[-0.01em] whitespace-nowrap transition-colors duration-200 ${
        on ? "border-midnight-50 bg-midnight-50 text-midnight-950" : "border-midnight-50/45 text-midnight-50 hover:border-midnight-50"
      }`}
    >
      {children}
    </button>
  );
}

export function ProjectFilterBar() {
  const { query, platform, context, visible, total, setQuery, setPlatform, setContext, reset } = useFilter();
  const filtered = Boolean(query.trim() || platform || context);

  return (
    <div role="search" aria-label="Projects" className="mt-56 flex flex-col gap-20 max-md:mt-40">
      <div className="flex flex-wrap items-center gap-x-28 gap-y-16">
        <label className="flex h-60 w-520 items-center gap-14 rounded-full border-2 border-midnight-50/45 bg-midnight-900/50 px-24 transition-colors focus-within:border-midnight-50 max-md:w-full">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-22 shrink-0 text-midnight-200">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Search projects</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, tool or client"
            className="min-w-0 flex-1 bg-transparent text-lead text-midnight-50 outline-none placeholder:text-midnight-200 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="flex size-28 shrink-0 items-center justify-center rounded-full text-midnight-200 transition-colors hover:bg-midnight-50/15 hover:text-midnight-50"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-16">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </label>
        <p aria-live="polite" className="text-lead text-midnight-200">
          {filtered ? `${visible.size} of ${total} projects` : `${total} projects`}
        </p>
        {filtered && (
          <button type="button" onClick={reset} className="text-lead font-semibold text-midnight-50 underline-offset-4 hover:underline">
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-10">
        {PLATFORMS.map((p) => (
          <Toggle key={p} on={platform === p} onClick={() => setPlatform(platform === p ? null : p)}>
            {p}
          </Toggle>
        ))}
        <span aria-hidden className="mx-8 h-28 w-2 rounded-full bg-midnight-50/25" />
        {CONTEXTS.map((c) => (
          <Toggle key={c} on={context === c} onClick={() => setContext(context === c ? null : c)}>
            {c}
          </Toggle>
        ))}
      </div>
    </div>
  );
}

/** A list whose rows show or hide with the filter. Rows alternate by their visible position. */
export function FilterList({ items, className }: { items: { slug: string; node: ReactNode }[]; className?: string }) {
  const { visible } = useFilter();
  let shown = 0;
  return (
    <ul className={className} hidden={!items.some((i) => visible.has(i.slug))}>
      {items.map(({ slug, node }) => {
        const on = visible.has(slug);
        const flip = on && shown++ % 2 === 1;
        return (
          <li key={slug} data-row hidden={!on} data-flip={flip} className="group/row">
            {node}
          </li>
        );
      })}
    </ul>
  );
}

/** A section that disappears when none of its projects match. */
export function FilterSection({ slugs, children, ...rest }: { slugs: string[]; children: ReactNode } & ComponentProps<"section">) {
  const { visible } = useFilter();
  return (
    <section {...rest} hidden={!slugs.some((s) => visible.has(s))}>
      {children}
    </section>
  );
}

export function FilterEmpty() {
  const { visible, reset } = useFilter();
  if (visible.size) return null;
  return (
    <div className="mt-120 flex flex-col items-start gap-24 max-md:mt-64">
      <p className="w-760 text-h4 font-semibold text-midnight-100 max-md:w-full">No project matches that. Try another word, or clear the filters.</p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-12 rounded-full border-2 border-midnight-50 px-28 py-10 text-lead font-semibold text-midnight-50 transition-colors hover:bg-midnight-50 hover:text-midnight-950"
      >
        Clear filters
      </button>
    </div>
  );
}
