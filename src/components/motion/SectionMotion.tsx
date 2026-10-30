"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import {
  assembleHeadline,
  designUnit,
  drawStrokes,
  magnetic,
  parallax,
  revealHeading,
  revealLines,
  revealUp,
  starburst,
} from "@/lib/motion";
import { onPageReveal } from "@/components/transition/PageTransition";

/**
 * Motion for each section, keyed by preset name (see MOTION_SPEC.md §5–6).
 * Sections stay server components; this wrapper finds their parts through
 * `data-*` hooks and owns every tween/ScrollTrigger, which `useGSAP` reverts
 * on unmount (and when Next hides the route).
 */

type Preset = (root: HTMLElement, q: (sel: string) => HTMLElement[]) => void | (() => void);

const one = (q: (sel: string) => HTMLElement[], sel: string) => q(sel)[0];

/** Run an intro timeline once the page is uncovered (first load or after a route transition). */
function playOnReveal(tl: gsap.core.Timeline) {
  tl.pause();
  return onPageReveal(() => tl.play());
}

function headings(q: (sel: string) => HTMLElement[]) {
  q("[data-heading]").forEach((h) => revealHeading(h));
}

function magnets(q: (sel: string) => HTMLElement[]) {
  const offs = q("[data-magnetic]").map((el) => magnetic(el, Number(el.dataset.magnetic) || 12));
  return () => offs.forEach((off) => off());
}

const presets: Record<string, Preset> = {
  hero(root, q) {
    const section = one(q, "section");
    const reduced = prefersReducedMotion();
    const u = designUnit();
    const tl = gsap.timeline();
    const headline = one(q, "[data-headline]");
    tl.add(assembleHeadline(headline), 0);
    if (!reduced) {
      const strokes = (sel: string) => q(`${sel} path[stroke]`);
      tl.fromTo(strokes("[data-underline]"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.8, ease: "power2.inOut" }, 0.9)
        .fromTo(strokes("[data-line]"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.8, ease: "power2.inOut", stagger: 0.2 }, 0.2)
        .from(q("[data-photo]"), { y: -80 * u, rotate: "+=15", autoAlpha: 0, duration: 1, ease: "back.out(1.4)", stagger: 0.12 }, 0.5)
        .from(q("[data-chip]"), { scale: 0, autoAlpha: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.08 }, 1.1)
        .from(q("[data-spark]"), { scale: 0, autoAlpha: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.05 }, 0.9)
        .fromTo(strokes("[data-spark-draw]"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.6, ease: "power2.out" }, 1.2)
        .from(q("[data-burst]"), { yPercent: 50, scale: 0.6, rotate: -45, duration: 1.2 }, 0.6);

      parallax(section);
      gsap.to(q("[data-burst] > *"), {
        rotate: 120,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: 1 },
      });
      gsap.to(q("[data-collage]"), {
        y: -60 * u,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: 1 },
      });
    }
    return playOnReveal(tl);
  },

  projects(root, q) {
    const section = one(q, "section");
    headings(q);
    q("[data-lines]").forEach((el) => revealLines(el, { delay: 0.2 }));
    const burst = one(q, "[data-burst]");
    if (burst) starburst(burst, { trigger: section });
    const grid = one(q, "[data-grid]");
    revealUp(q("[data-card]"), { trigger: grid, y: 60, stagger: 0.1, start: "top 85%" });
    parallax(section);
    q("[data-spin]").forEach((el) =>
      gsap.to(el, { rotate: 180, ease: "none", scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 1 } }),
    );
  },

  about(root, q) {
    const section = one(q, "section");
    headings(q);
    q("[data-lines]").forEach((el) => revealLines(el, { delay: 0.15 }));
    const reduced = prefersReducedMotion();
    if (reduced) return;
    const u = designUnit();
    const portrait = one(q, "[data-portrait]");
    gsap.from(portrait, {
      y: 60 * u,
      rotate: -6,
      autoAlpha: 0,
      duration: 1,
      scrollTrigger: { trigger: portrait, start: "top 85%", once: true },
    });
    gsap.from(q("[data-chip]"), {
      scale: 0,
      duration: 0.5,
      ease: "back.out(2)",
      stagger: 0.15,
      delay: 0.5,
      scrollTrigger: { trigger: portrait, start: "top 85%", once: true },
    });
    gsap.from(q("[data-spark]"), {
      scale: 0,
      rotate: -30,
      duration: 0.5,
      ease: "back.out(2)",
      stagger: 0.1,
      scrollTrigger: { trigger: section, start: "top 60%", once: true },
    });
    gsap.from(q("[data-rule]"), {
      scaleX: 0,
      transformOrigin: "left center",
      duration: 1,
      ease: "power3.inOut",
      scrollTrigger: { trigger: section, start: "top 85%", once: true },
    });
  },

  values(root, q) {
    headings(q);
    const grid = one(q, "[data-grid]");
    revealUp(q("[data-card]"), { trigger: grid, y: 60, stagger: 0.1 });
    if (prefersReducedMotion()) return;
    const u = designUnit();
    const at = (card: string) => ({ trigger: one(q, `[data-card="${card}"]`), start: "top 75%", once: true });
    gsap.from(q('[data-card="fast"] [data-chevron]'), { x: -60 * u, skewX: -15, autoAlpha: 0, duration: 0.7, stagger: 0.06, scrollTrigger: at("fast") });
    gsap.from(q('[data-card="reliable"] [data-bar]'), { scaleX: 0, duration: 0.6, stagger: 0.08, ease: "back.out(1.6)", scrollTrigger: at("reliable") });
    gsap.from(q('[data-card="reliable"] [data-block]'), { scale: 0.8, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: "back.out(1.6)", scrollTrigger: at("reliable") });
    const waves = q('[data-card="flexible"] [data-wave]');
    waves.forEach((w) => drawStrokes(w, { trigger: one(q, '[data-card="flexible"]'), scrub: false, start: "top 75%", duration: 1.2 }));
    waves.forEach((w, i) =>
      gsap.to(w, { y: (i ? -8 : 8) * u, duration: 2, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.4 }),
    );
    gsap.from(q('[data-card="lowCost"] [data-arrow]'), { y: -80 * u, autoAlpha: 0, duration: 0.8, ease: "back.out(1.4)", scrollTrigger: at("lowCost") });
    gsap.from(q('[data-card="lowCost"] [data-swoop]'), { scale: 0.6, autoAlpha: 0, duration: 0.7, stagger: 0.1, scrollTrigger: at("lowCost") });
    gsap.from(q('[data-card="lowCost"] [data-bar]'), { scaleX: 0, transformOrigin: "left center", duration: 0.5, stagger: 0.05, delay: 0.3, scrollTrigger: at("lowCost") });
    gsap.from(q('[data-card="problemSolver"] [data-piece]'), { rotate: -90, scale: 0.6, autoAlpha: 0, duration: 0.8, stagger: 0.12, ease: "back.out(1.6)", scrollTrigger: at("problemSolver") });
  },

  detail(root, q) {
    const section = one(q, "section");
    headings(q);
    q("[data-lines]").forEach((el) => revealLines(el, { delay: 0.15 }));
    if (!prefersReducedMotion()) {
      gsap.from(q("[data-curve]"), {
        rotate: -6,
        yPercent: 8,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top bottom", end: "top 40%", scrub: 1 },
      });
      gsap.from(q("[data-cta]"), { scale: 0.6, autoAlpha: 0, duration: 0.7, ease: "back.out(2)", scrollTrigger: { trigger: section, start: "top 75%", once: true } });
    }
    return magnets(q);
  },

  testimonials(root, q) {
    // The card deck (TestimonialDeck) runs its own entrance and autoplay.
    headings(q);
    q("[data-lines]").forEach((el) => revealLines(el, { delay: 0.15 }));
  },

  talk(root, q) {
    const section = one(q, "section");
    headings(q);
    q("[data-lines]").forEach((el) => revealLines(el, { delay: 0.15 }));
    if (!prefersReducedMotion()) {
      gsap.from(q("[data-cta]"), {
        scale: 0.8,
        rotate: -6,
        autoAlpha: 0,
        duration: 0.9,
        ease: "back.out(1.8)",
        scrollTrigger: { trigger: one(q, "[data-cta]"), start: "top 85%", once: true },
      });
      gsap.fromTo(
        q("[data-talk-row]"),
        { autoAlpha: 1 },
        { autoAlpha: 0.35, ease: "none", scrollTrigger: { trigger: section, start: "center 70%", end: "center 40%", scrub: true } },
      );
    }
    return magnets(q);
  },

  footer(root, q) {
    const section = one(q, "footer");
    if (prefersReducedMotion()) return;
    const st = { trigger: section, start: "top 90%", once: true };
    gsap.from(q("[data-block]"), { clipPath: "inset(100% 0 0 0)", duration: 1, ease: "power4.inOut", scrollTrigger: st });
    gsap.from(q("[data-footer-item]"), { y: 20 * designUnit(), autoAlpha: 0, duration: 0.6, stagger: 0.05, delay: 0.2, scrollTrigger: st });
  },

  experiences(root, q) {
    const reduced = prefersReducedMotion();
    const u = designUnit();
    const tl = gsap.timeline();
    tl.add(assembleHeadline(one(q, "[data-headline]")), 0);
    if (!reduced) {
      tl.from(q("[data-subline]"), { y: 40 * u, autoAlpha: 0, duration: 0.8, stagger: 0.1 }, 0.4)
        .from(q("[data-portrait]"), { y: -80 * u, rotate: 10, autoAlpha: 0, duration: 1, ease: "back.out(1.4)" }, 0.3)
        .from(q("[data-spark]"), { scale: 0, autoAlpha: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.1 }, 1)
        .from(q("[data-pop]"), { scale: 0, autoAlpha: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.06 }, 0.8);
      const curve = one(q, "[data-curve]");
      gsap.from(curve, {
        scaleY: 0.4,
        transformOrigin: "bottom",
        ease: "none",
        scrollTrigger: { trigger: curve, start: "top bottom", end: "top 40%", scrub: 1 },
      });
    }
    headings(q);
    q("[data-lines]").forEach((el) => revealLines(el, { delay: 0.1 }));
    q("[data-column]").forEach((col) => revealUp(col.querySelectorAll("[data-entry]"), { trigger: col, stagger: 0.1 }));
    const offMagnets = magnets(q);
    const offReveal = playOnReveal(tl);
    return () => {
      offMagnets();
      offReveal();
    };
  },
};

export function SectionMotion({ preset, children }: { preset: keyof typeof presets; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const el = root.current!;
      const q = (sel: string) => Array.from(el.querySelectorAll<HTMLElement>(sel));
      return presets[preset](el, q) ?? undefined;
    },
    { scope: root },
  );
  return (
    <div ref={root} className="contents">
      {children}
    </div>
  );
}
