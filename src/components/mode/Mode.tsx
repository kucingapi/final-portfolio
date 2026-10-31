"use client";

import { createContext, useContext, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { modes, type Mode } from "@/content/site";

/**
 * Freelance / Full-time. The mode lives on <html data-mode> (set before first paint by MODE_SCRIPT,
 * so the right copy shows without a flash) and in localStorage. Switching runs one sequence:
 * `mode:leave` (old copy fades out, the home slot plays its exit), the flip, then `mode:enter`.
 */

const KEY = "mode";
export const MODE_LEAVE = "mode:leave";
export const MODE_ENTER = "mode:enter";
const LEAVE_MS = 280;
const ENTER_MS = 700;

/** Inline in <head>: applies the saved mode before anything paints. */
export const MODE_SCRIPT = `try{var m=localStorage.getItem("${KEY}");if(m==="fulltime"||m==="freelance")document.documentElement.dataset.mode=m}catch(e){}`;

const ModeContext = createContext<{ mode: Mode; setMode: (m: Mode) => void } | null>(null);

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode needs <ModeProvider>.");
  return ctx;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The mode as <html data-mode> holds it; the server always renders Freelance. */
const CHANGE = "mode:change";
const readMode = (): Mode => (document.documentElement.dataset.mode === "fulltime" ? "fulltime" : "freelance");
const subscribe = (cb: () => void) => {
  window.addEventListener(CHANGE, cb);
  return () => window.removeEventListener(CHANGE, cb);
};

export function ModeProvider({ children }: { children: ReactNode }) {
  const applied = useSyncExternalStore(subscribe, readMode, () => "freelance" as Mode);
  // The tab moves the moment it is clicked, before the page has finished switching.
  const [pending, setPending] = useState<Mode | null>(null);
  const mode = pending ?? applied;
  const busy = useRef(false);

  const setMode = async (next: Mode) => {
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

/** The navbar tab: two options with a thumb that slides to the active one. */
export function ModeToggle({ className = "" }: { className?: string }) {
  const { mode, setMode } = useMode();
  const order: Mode[] = ["freelance", "fulltime"];
  return (
    <div role="radiogroup" aria-label="View as" className={`relative grid grid-cols-2 rounded-full border-2 border-midnight-50/50 p-4 ${className}`}>
      <span
        aria-hidden
        className="absolute inset-y-4 left-4 w-[calc(50%-var(--s)*4)] rounded-full bg-midnight-50 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: mode === "fulltime" ? "translateX(100%)" : "none" }}
      />
      {order.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => setMode(m)}
          className={`relative z-10 rounded-full px-20 py-8 font-inter text-chip font-semibold tracking-[-0.01em] whitespace-nowrap transition-colors duration-300 max-md:px-12 max-md:py-6 ${
            mode === m ? "text-midnight-950" : "text-midnight-50 hover:text-white"
          }`}
        >
          {modes[m].label}
        </button>
      ))}
    </div>
  );
}

/** Copy that differs by mode: both versions render, CSS shows the active one. */
export function ByMode({
  freelance,
  fulltime,
  as: Tag = "span",
  className,
}: {
  freelance: ReactNode;
  fulltime: ReactNode;
  as?: "span" | "div" | "p";
  className?: string;
}) {
  return (
    <>
      <Tag data-for="freelance" className={className}>
        {freelance}
      </Tag>
      <Tag data-for="fulltime" className={className}>
        {fulltime}
      </Tag>
    </>
  );
}
