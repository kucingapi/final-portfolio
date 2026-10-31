"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { designUnit } from "@/lib/motion";
import { MODE_ENTER, MODE_LEAVE } from "./Mode";

/**
 * The home page slot that is Projects in Freelance mode and Career in Full-time mode. On a switch,
 * if the slot is on screen, the shown section's parts (`data-swap`) drop away one after another and
 * the other section's rise in, under the same heading position and blue field.
 */
export function ModeSlot({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    const shown = () => Array.from(el.querySelectorAll<HTMLElement>("[data-slot]")).find((s) => s.getClientRects().length);
    const onScreen = (s: HTMLElement) => {
      const r = s.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight;
    };
    const parts = (s: HTMLElement) => s.querySelectorAll<HTMLElement>("[data-swap]");

    const leave = () => {
      const s = shown();
      if (!s || !onScreen(s) || prefersReducedMotion()) return;
      gsap.to(parts(s), { y: -40 * designUnit(), autoAlpha: 0, duration: 0.26, ease: "power2.in", stagger: 0.025, overwrite: true });
    };
    const enter = () => {
      // The section that just left keeps none of the exit, so it is whole when it comes back.
      gsap.set(el.querySelectorAll("[data-swap]"), { clearProps: "transform,opacity,visibility" });
      const s = shown();
      if (!s || !onScreen(s) || prefersReducedMotion()) return;
      gsap.fromTo(
        parts(s),
        { y: 70 * designUnit(), autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.8, ease: "power3.out", stagger: 0.06, clearProps: "transform" },
      );
    };
    window.addEventListener(MODE_LEAVE, leave);
    window.addEventListener(MODE_ENTER, enter);
    return () => {
      window.removeEventListener(MODE_LEAVE, leave);
      window.removeEventListener(MODE_ENTER, enter);
    };
  }, []);

  return (
    <div ref={root} className="contents">
      {children}
    </div>
  );
}
