"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

const LenisContext = createContext<RefObject<Lenis | null>>({ current: null });

/** Ref to the active Lenis instance; `.current` is null when smooth scroll is off (reduced motion). */
export const useLenis = () => useContext(LenisContext);

export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenis = useRef<Lenis | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const instance = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenis.current = instance;
    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis.current = null;
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
