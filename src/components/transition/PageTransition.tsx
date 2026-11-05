"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { useLenis } from "@/components/providers/SmoothScroll";

/**
 * E8 — circle-expand page transition (Figma "Page Transition" 350:12239).
 * A dot grows from where the link was clicked until it covers the screen, the route changes
 * underneath, then the circle shrinks back into that point. The same overlay doubles as the
 * first-load loader, which starts covering and shrinks to the centre.
 */

type Point = { x: number; y: number };
type TransitionApi = { navigate: (href: string, from?: Point) => void };
const TransitionContext = createContext<TransitionApi>({ navigate: () => {} });
export const usePageTransition = () => useContext(TransitionContext);

const REVEAL_EVENT = "page:reveal";

/** True while the overlay is covering the page (loader or mid-navigation). */
const isCovered = () => document.documentElement.dataset.covered === "true";

/**
 * Run `callback` once the page is visible — immediately if nothing is covering it,
 * otherwise when the overlay starts to uncover. Use for on-load intros.
 */
export function onPageReveal(callback: () => void) {
  if (!isCovered()) {
    callback();
    return () => {};
  }
  window.addEventListener(REVEAL_EVENT, callback, { once: true });
  return () => window.removeEventListener(REVEAL_EVENT, callback);
}

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const overlay = useRef<HTMLDivElement>(null);
  const circle = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLDivElement>(null);
  const pendingHref = useRef<string | null>(null);
  const busy = useRef(false);

  /** Centre the circle on `p` (viewport px), just big enough to reach the farthest corner. */
  const placeCircle = (p: Point) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const size = 2 * Math.hypot(Math.max(p.x, w - p.x), Math.max(p.y, h - p.y)) + 4;
    gsap.set(circle.current, { left: p.x, top: p.y, width: size, height: size });
  };

  const uncover = useCallback(() => {
    const reduced = prefersReducedMotion();
    lenis.current?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    ScrollTrigger.refresh();
    // A link like /#testimonials lands on its section, once pins and spacers are measured.
    const anchor = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (anchor) {
      if (lenis.current) lenis.current.scrollTo(anchor, { immediate: true, force: true });
      else anchor.scrollIntoView();
    }
    document.documentElement.dataset.covered = "false";
    window.dispatchEvent(new Event(REVEAL_EVENT));
    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(overlay.current, { autoAlpha: 0 });
        busy.current = false;
        lenis.current?.start();
      },
    });
    tl.to(mark.current, { autoAlpha: 0, duration: 0.2 });
    if (reduced) tl.to(overlay.current, { autoAlpha: 0, duration: 0.2 }, 0);
    else tl.to(circle.current, { scale: 0, duration: 0.6, ease: "power3.inOut" }, 0);
    return tl;
  }, [lenis]);

  // First load: the overlay is server-rendered fully covering; reveal once fonts are ready.
  useEffect(() => {
    let cancelled = false;
    const minHold = new Promise((r) => setTimeout(r, 450));
    Promise.all([document.fonts?.ready, minHold]).then(() => {
      if (!cancelled) uncover();
    });
    return () => {
      cancelled = true;
    };
    // Only on mount; later reveals are driven by navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigation finished: the new route is rendered under the overlay.
  useEffect(() => {
    if (pendingHref.current && pathname === new URL(pendingHref.current, location.href).pathname) {
      pendingHref.current = null;
      requestAnimationFrame(() => uncover());
    }
  }, [pathname, uncover]);

  const navigate = useCallback(
    (href: string, from?: Point) => {
      const target = new URL(href, location.href);
      if (busy.current) return;
      if (target.pathname === pathname) {
        if (lenis.current) lenis.current.scrollTo(target.hash || 0);
        else window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      busy.current = true;
      lenis.current?.stop();
      document.documentElement.dataset.covered = "true";
      placeCircle(from ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 });
      gsap.set(overlay.current, { autoAlpha: 1 });
      const done = () => {
        pendingHref.current = href;
        router.push(href, { scroll: false });
      };
      if (prefersReducedMotion()) {
        gsap.fromTo(overlay.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, onComplete: done });
      } else {
        gsap.fromTo(circle.current, { scale: 0 }, { scale: 1, duration: 0.7, ease: "power3.inOut", onComplete: done });
      }
    },
    [lenis, pathname, router],
  );

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <div
        ref={overlay}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
        data-node-id="350:12239"
      >
        <div
          ref={circle}
          className="absolute top-1/2 left-1/2 aspect-square w-[300vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-midnight-600"
        />
        <div ref={mark} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Image src="/figma/brand/logo.svg" alt="" width={39} height={42} preload className="h-42 w-39" />
        </div>
      </div>
    </TransitionContext.Provider>
  );
}

/** Drop-in `next/link` that plays the page transition for internal routes. */
export function TransitionLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const { navigate } = usePageTransition();
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (props.target && props.target !== "_self") return;
    e.preventDefault();
    // The circle grows from the pointer; a keyboard "click" (detail 0) has none, so use the link's centre.
    const box = e.currentTarget.getBoundingClientRect();
    const from = e.detail > 0 ? { x: e.clientX, y: e.clientY } : { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    navigate(href, from);
  };
  return <Link href={href} onClick={handleClick} {...props} />;
}
