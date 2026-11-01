"use client";

import Image from "next/image";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

export type PreviewItem = { image?: string; org: string; role: string; period: string };

const noop = () => () => {};

/**
 * Hover preview for the clickable rows of a list (each marked `data-preview="<index>"`): a card
 * follows the pointer with a little lag and tilt, its strip of images slides to the hovered row,
 * and a "View case study" pill says what a click does. Leaving a clickable row hides it. Mouse
 * only; on touch screens nothing happens. The card is portalled to <body> because the page canvas
 * is a CSS container, which would pin `position: fixed` to itself instead of the viewport.
 */
export function CareerPreview({ items, children }: { items: PreviewItem[]; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const isClient = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    const el = root.current;
    const c = card.current;
    const t = track.current;
    if (!el || !c || !t || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduced = prefersReducedMotion();
    const n = items.length;
    // The card sits just right of the pointer, so the row's name under it stays readable.
    const GAP = 36;
    gsap.set(c, { xPercent: 0, yPercent: -50, scale: 0.6, autoAlpha: 0, transformOrigin: "0% 50%" });
    const xTo = gsap.quickTo(c, "x", { duration: reduced ? 0 : 0.6, ease: "power3" });
    const yTo = gsap.quickTo(c, "y", { duration: reduced ? 0 : 0.6, ease: "power3" });
    const tilt = gsap.quickTo(c, "rotation", { duration: 0.7, ease: "power3" });
    let active = -1;
    let lastX = 0;

    const move = (e: PointerEvent) => {
      xTo(e.clientX + GAP);
      yTo(e.clientY);
      if (!reduced) tilt(gsap.utils.clamp(-7, 7, (e.clientX - lastX) * 0.5));
      lastX = e.clientX;
    };
    const over = (e: PointerEvent) => {
      const row = (e.target as Element).closest<HTMLElement>("[data-preview]");
      if (!row || !el.contains(row)) {
        if (active !== -1) leave();
        return;
      }
      const i = Number(row.dataset.preview);
      if (i === active) return;
      const to = { yPercent: (-100 * i) / n };
      if (active === -1) {
        // First row entered: start at the pointer, already on the right image.
        gsap.set(c, { x: e.clientX + GAP, y: e.clientY });
        gsap.set(t, to);
        gsap.to(c, { scale: 1, autoAlpha: 1, duration: reduced ? 0.15 : 0.45, ease: "power3.out", overwrite: "auto" });
      } else {
        gsap.to(t, { ...to, duration: reduced ? 0 : 0.6, ease: "power3.inOut", overwrite: true });
      }
      active = i;
    };
    function leave() {
      active = -1;
      gsap.to(c, { scale: 0.6, autoAlpha: 0, rotation: 0, duration: reduced ? 0.1 : 0.3, ease: "power2.in", overwrite: "auto" });
    }

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerover", over);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerover", over);
      el.removeEventListener("pointerleave", leave);
    };
  }, [items.length, isClient]);

  return (
    <div ref={root} data-preview-list>
      {children}
      {isClient &&
        createPortal(
          <div
            ref={card}
            aria-hidden
            className="pointer-events-none invisible fixed top-0 left-0 z-50 h-[calc(var(--s)*260)] w-[calc(var(--s)*380)] overflow-hidden rounded-lg border-2 border-midnight-50 bg-midnight-950 shadow-[0_calc(var(--s)*24)_calc(var(--s)*48)_rgb(1_3_38/0.45)] max-md:hidden"
          >
            <div ref={track} className="w-full" style={{ height: `${items.length * 100}%` }}>
              {items.map((item, i) => (
                <div key={i} className="relative w-full" style={{ height: `${100 / items.length}%` }}>
                  {item.image ? (
                    <Image src={item.image} alt="" fill sizes="400px" className="object-cover" />
                  ) : (
                    <div className="flex size-full flex-col justify-between bg-midnight-500 p-[calc(var(--s)*28)]">
                      <span className="font-display text-[calc(var(--s)*44)] leading-[1.05] font-semibold text-midnight-50">{item.org}</span>
                      <span className="flex flex-col gap-[calc(var(--s)*4)] text-[calc(var(--s)*16)] text-midnight-100">
                        <span className="font-semibold text-midnight-50">{item.role}</span>
                        <span>{item.period}</span>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Says what a click does, like the cursor labels on Awwwards-style lists. */}
            <span className="absolute bottom-[calc(var(--s)*16)] left-[calc(var(--s)*16)] inline-flex items-center gap-[calc(var(--s)*8)] rounded-full bg-midnight-50 px-[calc(var(--s)*16)] py-[calc(var(--s)*8)] font-inter text-[calc(var(--s)*14)] font-semibold text-midnight-950 shadow-[0_calc(var(--s)*6)_calc(var(--s)*16)_rgb(1_3_38/0.3)]">
              View case study
              <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-[calc(var(--s)*16)]">
                <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>,
          document.body,
        )}
    </div>
  );
}
