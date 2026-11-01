"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

const noop = () => () => {};

/**
 * Cursor label for the clickable rows of a list (each marked `data-preview`): a small "View case
 * study" pill follows the pointer with a little lag, so it reads as "you can click this". Leaving a
 * clickable row hides it. Mouse only; on touch screens nothing happens. The pill is portalled to
 * <body> because the page canvas is a CSS container, which would pin `position: fixed` to itself
 * instead of the viewport.
 */
export function CareerCursor({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const isClient = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    const el = root.current;
    const c = label.current;
    if (!el || !c || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduced = prefersReducedMotion();
    // Just below and right of the pointer, clear of the text under it.
    const GAP = 18;
    gsap.set(c, { scale: 0, autoAlpha: 0, transformOrigin: "0% 0%" });
    const xTo = gsap.quickTo(c, "x", { duration: reduced ? 0 : 0.35, ease: "power3" });
    const yTo = gsap.quickTo(c, "y", { duration: reduced ? 0 : 0.35, ease: "power3" });
    let shown = false;

    const move = (e: PointerEvent) => {
      xTo(e.clientX + GAP);
      yTo(e.clientY + GAP);
    };
    const over = (e: PointerEvent) => {
      const row = (e.target as Element).closest("[data-preview]");
      if (!row || !el.contains(row)) {
        if (shown) hide();
        return;
      }
      if (shown) return;
      shown = true;
      gsap.set(c, { x: e.clientX + GAP, y: e.clientY + GAP });
      gsap.to(c, { scale: 1, autoAlpha: 1, duration: reduced ? 0.15 : 0.35, ease: "back.out(2)", overwrite: "auto" });
    };
    function hide() {
      shown = false;
      gsap.to(c, { scale: 0, autoAlpha: 0, duration: reduced ? 0.1 : 0.2, ease: "power2.in", overwrite: "auto" });
    }

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerover", over);
    el.addEventListener("pointerleave", hide);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerover", over);
      el.removeEventListener("pointerleave", hide);
    };
  }, [isClient]);

  return (
    <div ref={root} data-preview-list>
      {children}
      {isClient &&
        createPortal(
          <span
            ref={label}
            aria-hidden
            className="pointer-events-none invisible fixed top-0 left-0 z-50 inline-flex items-center gap-[calc(var(--s)*6)] rounded-full bg-midnight-50 px-[calc(var(--s)*14)] py-[calc(var(--s)*7)] font-inter text-[max(12px,calc(var(--s)*14))] font-semibold whitespace-nowrap text-midnight-950 shadow-[0_calc(var(--s)*6)_calc(var(--s)*16)_rgb(1_3_38/0.3)] max-md:hidden"
          >
            View case study
            <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-[calc(var(--s)*14)]">
              <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>,
          document.body,
        )}
    </div>
  );
}
