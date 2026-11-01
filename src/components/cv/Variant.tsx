"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMode } from "@/components/mode/Mode";
import { track } from "@/lib/analytics";
import type { PublicVariant } from "@/lib/cv/variant";

/**
 * Tailored links. A link carries only an opaque code (`/?v=k7qx2pmd`); on arrival the code leaves the
 * address bar at once, its variant is fetched, and it is kept in localStorage so the rest of the visit
 * (and later visits) stay tailored without anything showing in the URL. The variant orders the
 * projects, picks the CV's lines and can set the site's mode.
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

/** Picks up `?v=` once per page load. Lives inside ModeProvider so a variant can set the mode. */
export function VariantLoader() {
  const { setMode } = useMode();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get(PARAM);
    if (!code) return;
    url.searchParams.delete(PARAM);
    window.history.replaceState(window.history.state, "", url);
    const before = read().current;
    fetch(`/api/v/${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? (r.json() as Promise<PublicVariant>) : null))
      .then((found) => {
        track("tailored_link_opened", { v_code: code, found: Boolean(found) });
        write({ current: found ?? before, loading: false });
        if (found?.variant.mode) setMode(found.variant.mode, { quiet: true });
      })
      .catch(() => write({ current: before, loading: false }));
    // Once per load; setMode is stable enough for this and re-running would refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
