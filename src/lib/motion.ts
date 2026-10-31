"use client";

import { gsap, SplitText, prefersReducedMotion } from "./gsap";

/** One Figma design pixel in CSS px (mirrors `--s` in globals.css). */
export function designUnit() {
  const w = document.body.clientWidth;
  return window.innerWidth < 768 ? w / 430 : Math.min(w, 1440) / 1440;
}

const ENTER = "top 80%";

/**
 * Play a reveal the first time its trigger is reached, and leave it. Not `...PLAY_ONCE`: a `once`
 * trigger kills itself, and when several are already past their start as a page opens (a reload
 * restores the scroll position), they die while ScrollTrigger is still refreshing its list and it
 * crashes ("curTrigger is undefined"). These triggers stay alive and simply do nothing after.
 */
export const PLAY_ONCE = { toggleActions: "play none none none" } as const;

/**
 * E7 — heading reveal: lines rise out of a mask, then the highlight bar
 * (`[data-highlight]` inside the same wrapper) wipes in from the left.
 */
export function revealHeading(
  wrapper: Element,
  { trigger = wrapper, delay = 0 }: { trigger?: Element; delay?: number } = {},
) {
  // Copy for the other mode (Freelance / Full-time) is display:none and can't be split; it just shows.
  if (!wrapper.getClientRects().length) return;
  const title = wrapper.querySelector("[data-title]") ?? wrapper;
  const bar = wrapper.querySelector("[data-highlight]");
  if (prefersReducedMotion()) {
    gsap.from(wrapper, { autoAlpha: 0, duration: 0.2, scrollTrigger: { trigger, start: ENTER, ...PLAY_ONCE } });
    return;
  }
  const split = SplitText.create(title, { type: "lines", mask: "lines", linesClass: "line" });
  const tl = gsap.timeline({ delay, scrollTrigger: { trigger, start: ENTER, ...PLAY_ONCE } });
  tl.from(split.lines, { yPercent: 110, stagger: 0.12 });
  if (bar) tl.from(bar, { scaleX: 0, transformOrigin: "left center", duration: 0.5, ease: "power3.out" }, 0.2);
  return tl;
}

/** Body copy / small blocks: short rise + fade, once. */
export function revealUp(
  targets: gsap.TweenTarget,
  { trigger, y = 24, stagger = 0.08, delay = 0, start = ENTER }: { trigger: Element; y?: number; stagger?: number; delay?: number; start?: string },
) {
  const reduced = prefersReducedMotion();
  return gsap.from(targets, {
    y: reduced ? 0 : y * designUnit(),
    autoAlpha: 0,
    duration: reduced ? 0.2 : 0.8,
    stagger: reduced ? 0 : stagger,
    delay,
    // Hand transforms back to CSS so Tailwind hover translate/scale works afterwards.
    clearProps: "transform,translate,rotate,scale",
    scrollTrigger: { trigger, start, ...PLAY_ONCE },
  });
}

/** Body copy split into lines that rise in one after another. */
export function revealLines(el: Element, { trigger = el, delay = 0 }: { trigger?: Element; delay?: number } = {}) {
  if (!el.getClientRects().length) return; // hidden by the other mode: nothing to split
  if (prefersReducedMotion()) return revealUp(el, { trigger });
  const split = SplitText.create(el, { type: "lines", mask: "lines" });
  return gsap.from(split.lines, {
    yPercent: 100,
    stagger: 0.08,
    delay,
    scrollTrigger: { trigger, start: ENTER, ...PLAY_ONCE },
  });
}

/**
 * E1 — headline assemble: lines start pulled apart vertically and each word is
 * pushed away from the line's centre, then everything settles into the Figma layout.
 */
export function assembleHeadline(el: Element, { delay = 0 }: { delay?: number } = {}) {
  if (prefersReducedMotion()) return gsap.from(el, { autoAlpha: 0, duration: 0.2, delay });
  const split = SplitText.create(el, { type: "lines,words", linesClass: "line", wordsClass: "word" });
  const lines = split.lines;
  const fontSize = parseFloat(getComputedStyle(el).fontSize);
  const tl = gsap.timeline({ delay });
  lines.forEach((line, i) => {
    const words = line.querySelectorAll(".word");
    const offset = i - (lines.length - 1) / 2;
    tl.from(line, { y: offset * fontSize * 0.9, duration: 1.6 }, i * 0.12);
    words.forEach((word, j) => {
      const side = j - (words.length - 1) / 2 || (i % 2 ? 1 : -1) * 0.5;
      tl.from(word, { x: side * fontSize * 1.6, duration: 1.6 }, i * 0.12);
    });
  });
  tl.from(el, { autoAlpha: 0, duration: 0.5, ease: "power1.out" }, 0);
  return tl;
}

/**
 * E2 — line draw. Draws every stroked path inside `root`. With `scrub`, progress
 * follows scroll between `start` and `end`; otherwise it plays once on enter.
 */
export function drawStrokes(
  root: Element,
  {
    trigger = root,
    start = "top 85%",
    end = "center 40%",
    scrub = true,
    duration = 1.2,
    delay = 0,
  }: { trigger?: Element; start?: string; end?: string; scrub?: boolean | number; duration?: number; delay?: number } = {},
) {
  const paths = root.querySelectorAll("path[stroke], line[stroke], polyline[stroke]");
  if (!paths.length || prefersReducedMotion()) return;
  if (!scrub) {
    return gsap.fromTo(
      paths,
      { drawSVG: "0%" },
      { drawSVG: "100%", duration, delay, ease: "power2.inOut", scrollTrigger: { trigger, start, ...PLAY_ONCE } },
    );
  }
  return gsap.fromTo(
    paths,
    { drawSVG: "0%" },
    { drawSVG: "100%", ease: "none", scrollTrigger: { trigger, start, end, scrub } },
  );
}

/** E4 — parallax: every `[data-speed]` inside `section` drifts at its own rate. */
export function parallax(section: Element) {
  if (prefersReducedMotion() || window.innerWidth < 768) return;
  section.querySelectorAll<HTMLElement>("[data-speed]").forEach((el) => {
    const speed = parseFloat(el.dataset.speed ?? "1");
    gsap.to(el, {
      y: (1 - speed) * 200 * designUnit(),
      ease: "none",
      scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 1 },
    });
  });
}

/** E9 — magnetic hover. Returns a cleanup for the listeners. */
export function magnetic(el: HTMLElement, strength = 12) {
  if (prefersReducedMotion() || !window.matchMedia("(hover: hover)").matches) return () => {};
  const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
  const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    xTo(gsap.utils.clamp(-1, 1, dx) * strength);
    yTo(gsap.utils.clamp(-1, 1, dy) * strength);
  };
  const onLeave = () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
  };
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerleave", onLeave);
  return () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerleave", onLeave);
  };
}
