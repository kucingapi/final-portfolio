"use client";

import { createContext, useContext, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { track } from "@/lib/analytics";
import { DEFAULT_MODE, MODES, MODE_ALIASES, isMode, type Mode } from "@/lib/modes";

/**
 * Freelance / Full-time / Speaker. The mode lives on <html data-mode> (set before first paint by MODE_SCRIPT,
 * so the right copy shows without a flash) and in localStorage. A `?mode=fulltime`,
 * `?mode=freelance` or `?mode=speaker` link wins over what was saved, so a link can open the site in either mode.
 * Switching runs one sequence: `mode:leave` (old copy fades out, the home slot plays its exit),
 * the flip, then `mode:enter`; it also writes `?mode=` so the address bar can be shared as is.
 */

/** Where the mode is saved; MODE_SCRIPT reads it before first paint. */
export const MODE_KEY = "mode";
const KEY = MODE_KEY;
export const MODE_LEAVE = "mode:leave";
export const MODE_ENTER = "mode:enter";
const LEAVE_MS = 280;
const ENTER_MS = 700;

const PARAM = "mode";

/** Inline in <head>: applies `?mode=` (saving it), else the saved mode, before anything paints. */
export const MODE_SCRIPT = `try{var M=${JSON.stringify(MODES)},A=${JSON.stringify(MODE_ALIASES)},p=new URLSearchParams(location.search).get("${PARAM}"),m=null;if(p){p=p.toLowerCase().replace(/[^a-z]/g,"");p=A[p]||p;if(M.indexOf(p)>=0){m=p;localStorage.setItem("${KEY}",m)}}m=m||localStorage.getItem("${KEY}");if(M.indexOf(m)>=0)document.documentElement.dataset.mode=m}catch(e){}`;

/** Put the mode in the address bar, keeping the page's other parameters (like the projects filter). */
function writeParam(mode: Mode) {
  const url = new URL(window.location.href);
  url.searchParams.set(PARAM, mode);
  window.history.replaceState(window.history.state, "", url);
}

/** `quiet` switches without writing `?mode=`, for switches the visitor did not make (a tailored link). */
type SetMode = (m: Mode, opts?: { quiet?: boolean }) => void;
const ModeContext = createContext<{ mode: Mode; setMode: SetMode } | null>(null);

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode needs <ModeProvider>.");
  return ctx;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The mode as <html data-mode> holds it; the server always renders Freelance. */
const CHANGE = "mode:change";
const readMode = (): Mode => {
  const m = document.documentElement.dataset.mode;
  return isMode(m) ? m : DEFAULT_MODE;
};
const subscribe = (cb: () => void) => {
  window.addEventListener(CHANGE, cb);
  return () => window.removeEventListener(CHANGE, cb);
};

export function ModeProvider({ children }: { children: ReactNode }) {
  const applied = useSyncExternalStore(subscribe, readMode, () => DEFAULT_MODE);
  // The tab moves the moment it is clicked, before the page has finished switching.
  const [pending, setPending] = useState<Mode | null>(null);
  const mode = pending ?? applied;
  const busy = useRef(false);

  const setMode = async (next: Mode, opts?: { quiet?: boolean }) => {
    if (busy.current || next === readMode()) return;
    busy.current = true;
    const html = document.documentElement;
    const reduced = prefersReducedMotion();
    setPending(next);
    if (!reduced) {
      html.classList.add("mode-leaving");
      window.dispatchEvent(new CustomEvent(MODE_LEAVE, { detail: next }));
      await wait(LEAVE_MS);
    }
    html.dataset.mode = next;
    window.dispatchEvent(new Event(CHANGE));
    setPending(null);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    if (!opts?.quiet) writeParam(next);
    track("mode_switched", { to: next, by: opts?.quiet ? "tailored link" : "visitor" });
    html.classList.remove("mode-leaving");
    if (!reduced) html.classList.add("mode-entering");
    window.dispatchEvent(new CustomEvent(MODE_ENTER, { detail: next }));
    // Sections changed height, so every scroll trigger below them needs measuring again.
    requestAnimationFrame(() => ScrollTrigger.refresh());
    await wait(reduced ? 0 : ENTER_MS);
    html.classList.remove("mode-entering");
    busy.current = false;
  };

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

/** Copy that differs by mode: both versions render, CSS shows the active one. */
export function ByMode({
  values,
  as: Tag = "span",
  className,
}: {
  values: Record<Mode, ReactNode>;
  as?: "span" | "div" | "p";
  className?: string;
}) {
  return (
    <>
      {MODES.map((m) => (
        <Tag key={m} data-for={m} className={className}>
          {values[m]}
        </Tag>
      ))}
    </>
  );
}
