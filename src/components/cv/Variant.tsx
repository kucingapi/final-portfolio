"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMode } from "@/components/mode/Mode";
import { leading } from "@/content/projects";
import { isTester, track } from "@/lib/analytics";
import type { PublicVariant } from "@/lib/cv/variant";
import { useLang } from "@/lib/i18n/client";
import { DEFAULT_LANG, localePath, splitLang } from "@/lib/i18n/lang";

/**
 * Tailored links. A link carries only an opaque code (`/?v=k7qx2pmd`); on arrival the code leaves the
 * address bar at once, its variant is fetched, and it is kept in localStorage so the rest of the visit
 * (and later visits) stay tailored without anything showing in the URL. The variant orders the
 * projects, picks the CV's lines and can set the site's mode and language.
 */

const PARAM = "v";
const KEY = "nb.pref";
const CHANGE = "variant:change";

type State = { current: PublicVariant | null; loading: boolean };
const SERVER: State = { current: null, loading: false };
let state: State | null = null;

function read(): State {
  if (!state) {
    let current: PublicVariant | null = null;
    try {
      current = JSON.parse(localStorage.getItem(KEY) ?? "null");
    } catch {}
    // A code still in the address bar means its variant is on the way; don't show the default first.
    const loading = new URLSearchParams(location.search).has(PARAM);
    state = { current, loading };
  }
  return state;
}

function write(next: State) {
  state = next;
  try {
    if (next.current) localStorage.setItem(KEY, JSON.stringify(next.current));
  } catch {}
  window.dispatchEvent(new Event(CHANGE));
}

const subscribe = (cb: () => void) => {
  window.addEventListener(CHANGE, cb);
  return () => window.removeEventListener(CHANGE, cb);
};

/** The variant this visitor came with, or null; `loading` while a fresh code is being fetched. */
export function useVariant(): State {
  return useSyncExternalStore(subscribe, read, () => SERVER);
}

/** Lead with the variant's projects, then everything else in its usual order. */
export function useVariantOrder<T extends { slug: string }>(items: T[]): T[] {
  const lead = useVariant().current?.variant.projects;
  if (!lead?.length) return items;
  const first = lead.map((s) => items.find((i) => i.slug === s)).filter((i): i is T => Boolean(i));
  return [...first, ...items.filter((i) => !lead.includes(i.slug))];
}

/**
 * The projects that lead for this visitor: the first four with a device render, in the variant's order
 * when it has one (see `leading` in src/content/projects.ts). `items` come in the site's order.
 */
export function useLead<T extends { slug: string; art?: unknown }>(items: T[]): { lead: T[]; rest: T[] } {
  const ordered = useVariantOrder(items);
  const lead = leading(ordered);
  return { lead, rest: ordered.filter((i) => !lead.includes(i)) };
}

/** The variant's chosen headline figure for a project (a chapter id), if any. */
export function useVariantStat(slug: string): string | undefined {
  return useVariant().current?.variant.stats?.[slug];
}

/**
 * Picks up `?v=` once per page load. Lives inside ModeProvider so a variant can set the mode. A variant in
 * the other language opens the same page in its language; after that the visitor's own switch decides.
 */
export function VariantLoader() {
  const { setMode } = useMode();
  const lang = useLang();

  useEffect(() => {
    const url = new URL(window.location.href);
    // `?test=1` / `?test=0` marks or clears Novel's own browser; it leaves the address bar too.
    if (url.searchParams.has("test")) {
      isTester();
      url.searchParams.delete("test");
      window.history.replaceState(window.history.state, "", url);
    }
    const code = url.searchParams.get(PARAM);
    if (!code) return;
    // `lang` pins the page's language: a CV or deck in the other language links back with it, and so
    // does the move below. `moved` marks that move, whose open was counted on the page it left.
    const pinned = url.searchParams.has("lang");
    const moved = url.searchParams.has("moved");
    for (const key of [PARAM, "lang", "moved"]) url.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", url);
    const before = read().current;
    fetch(`/api/v/${encodeURIComponent(code)}${moved ? "?moved=1" : ""}`)
      .then((r) => (r.ok ? (r.json() as Promise<PublicVariant>) : null))
      .then((found) => {
        const wanted = found?.variant.lang ?? DEFAULT_LANG;
        if (found && wanted !== lang && !pinned) {
          // The link is in the other language: open the same page there, code and all, so it is tailored
          // (and tagged for analytics) without relying on storage. Counted here, tracked there.
          const there = new URL(localePath(wanted, splitLang(url.pathname).path) + url.search + url.hash, url.origin);
          there.searchParams.set(PARAM, code);
          there.searchParams.set("lang", wanted);
          there.searchParams.set("moved", "1");
          window.location.replace(there);
          return;
        }
        track("tailored_link_opened", { v_code: code, found: Boolean(found), lang });
        write({ current: found ?? before, loading: false });
        if (found?.variant.mode) setMode(found.variant.mode, { quiet: true });
      })
      .catch(() => write({ current: before, loading: false }));
    // Once per load; setMode is stable enough for this and re-running would refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
