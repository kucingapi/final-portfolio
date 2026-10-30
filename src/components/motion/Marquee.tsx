"use client";

import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";

/**
 * E5 — infinite marquee. `children` is one run of content; it's rendered twice so
 * the loop is seamless. `direction` 1 moves left, -1 moves right. Scroll velocity
 * speeds it up (and scrolling up flips it), easing back to the base speed.
 */
export function Marquee({
  children,
  duration = 30,
  direction = 1,
  className = "",
  trackClassName = "",
}: {
  children: ReactNode;
  duration?: number;
  direction?: 1 | -1;
  className?: string;
  trackClassName?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const loop = gsap.fromTo(track.current, { xPercent: 0 }, { xPercent: -50, duration, ease: "none", repeat: -1 });
      // Park far from 0 so negative timeScale (moving right) never hits the start.
      loop.totalTime(duration * 1000);
      loop.timeScale(direction);
      let base: number = direction;
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? loop.resume() : loop.pause()),
        onUpdate: (self) => {
          const v = self.getVelocity();
          base = self.direction === 1 ? direction : -direction;
          const boost = gsap.utils.clamp(1, 4, 1 + Math.abs(v) / 400);
          gsap.to(loop, { timeScale: base * boost, duration: 0.2, overwrite: true });
          gsap.to(loop, { timeScale: base, duration: 0.6, delay: 0.2, overwrite: false });
        },
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className={`overflow-hidden ${className}`}>
      <div ref={track} className={`flex w-max will-change-transform ${trackClassName}`}>
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
