"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { designUnit } from "@/lib/motion";
import type { Mode, Testimonial } from "@/content/site";
import { useUi } from "@/lib/i18n/client";

/** Seconds a card stays in front before autoplay moves on. */
const DWELL = 6;
/** Fan offsets for depth 0, 1, 2 (Figma 249:2682: 707/663/622 wide, each peeking 16px above the next). */
const DEPTH = [
  { yPercent: 0, scale: 1 },
  { yPercent: -4.2, scale: 0.938 },
  { yPercent: -8.4, scale: 0.88 },
];

const card = "rounded-sm border-[calc(var(--s)*5)] border-midnight-50 bg-midnight-900 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]";
const round = "flex size-64 shrink-0 items-center justify-center rounded-full bg-midnight-50 transition-[background-color,translate] duration-300 hover:bg-midnight-200 max-md:size-48";

/**
 * A long quote steps down a size, with roomier lines, so the card still holds it; a short one keeps the
 * Figma size. Phones step down from their own smaller heading.
 */
function quoteSize(quote: string) {
  const n = quote.length;
  if (n <= 125) return "text-h4";
  if (n <= 240) return "text-[calc(var(--s)*30)] leading-[1.25] max-md:text-[calc(var(--s)*19)]";
  if (n <= 380) return "text-[calc(var(--s)*24)] leading-[1.35] max-md:text-[calc(var(--s)*17)]";
  return "text-[calc(var(--s)*20)] leading-[1.45] font-medium max-md:text-[max(14px,calc(var(--s)*16))]";
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * Testimonial deck: the fanned stack from Figma, live. The front card is tossed aside and the
 * rest step forward every DWELL seconds (progress bar), or on prev/next, arrow keys, or a swipe.
 * Autoplay holds while the deck is off screen, hovered, focused, dragged, or the tab is hidden,
 * and never runs with reduced motion.
 */
export function TestimonialDeck({ testimonials, mode }: { testimonials: Testimonial[]; mode?: Mode }) {
  const root = useRef<HTMLDivElement>(null);
  const controls = useRef<{ step: (dir: 1 | -1) => void } | null>(null);
  const [front, setFront] = useState(0);
  const count = testimonials.length;
  const words = useUi().testimonials;

  useGSAP(
    (_, contextSafe) => {
      const el = root.current!;
      const cards = gsap.utils.toArray<HTMLElement>("[data-deck-card]", el);
      const bar = el.querySelector<HTMLElement>("[data-deck-progress]");
      const reduced = prefersReducedMotion();
      const u = designUnit();
      const last = DEPTH.length - 1;
      let order = cards.map((_, i) => i); // order[0] is the front card
      let busy = false;
      const holds = new Set(["intro", "view"]);

      const quote = (c: HTMLElement) => c.querySelector("[data-quote]");

      const place = (c: HTMLElement, depth: number, animate: boolean) => {
        const d = DEPTH[Math.min(depth, last)];
        gsap.set(c, { zIndex: count - depth });
        const vars = { ...d, x: 0, xPercent: 0, rotate: 0, autoAlpha: depth <= last ? 1 : 0 };
        if (animate) gsap.to(c, { ...vars, duration: reduced ? 0.3 : 0.7, ease: "power3.out", overwrite: "auto" });
        else gsap.set(c, vars);
        if (animate) gsap.to(quote(c), { autoAlpha: depth ? 0 : 1, duration: depth ? 0.2 : 0.5, delay: depth ? 0 : 0.25, overwrite: "auto" });
        else gsap.set(quote(c), { autoAlpha: depth ? 0 : 1 });
      };
      order.forEach((c, depth) => place(cards[c], depth, false));

      const timer = gsap.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: DWELL, ease: "none", paused: true, onComplete: () => step(1) });
      const sync = () => {
        if (reduced || holds.size || busy) timer.pause();
        else timer.resume();
      };

      const settle = () => {
        busy = false;
        setFront(order[0]);
        timer.pause(0);
        sync();
      };

      /** dir 1 = next (front card leaves toward `toss`), -1 = previous (back card returns to the front). */
      const step = contextSafe!((dir: 1 | -1, toss: 1 | -1 = -1) => {
        if (busy || count < 2) return;
        busy = true;
        timer.pause();
        if (dir === 1) {
          const leaving = cards[order[0]];
          order = [...order.slice(1), order[0]];
          order.slice(0, -1).forEach((c, depth) => place(cards[c], depth, true));
          gsap.set(leaving, { zIndex: count + 1 });
          const tl = gsap.timeline({ onComplete: settle });
          if (reduced) tl.to(leaving, { autoAlpha: 0, duration: 0.3 });
          else tl.to(leaving, { xPercent: 115 * toss, rotate: 14 * toss, autoAlpha: 0, duration: 0.6, ease: "power2.in" });
          tl.add(() => {
            place(leaving, count - 1, false);
            gsap.from(leaving, { autoAlpha: 0, duration: 0.4 });
          });
        } else {
          const coming = cards[order[count - 1]];
          order = [order[count - 1], ...order.slice(0, -1)];
          order.slice(1).forEach((c, i) => place(cards[c], i + 1, true));
          gsap.set(coming, { zIndex: count + 1, ...DEPTH[0] });
          gsap.set(quote(coming), { autoAlpha: 1 });
          const tl = gsap.timeline({ onComplete: () => (gsap.set(coming, { zIndex: count }), settle()) });
          if (reduced) tl.fromTo(coming, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
          else tl.fromTo(coming, { xPercent: -115, rotate: -14, autoAlpha: 0 }, { xPercent: 0, rotate: 0, autoAlpha: 1, duration: 0.7, ease: "power3.out" });
        }
      });
      controls.current = { step };

      const hold = (key: string, on: boolean) => {
        if (on) holds.add(key);
        else holds.delete(key);
        sync();
      };

      // Entrance, then autoplay once the deck has landed.
      const intro = gsap.timeline({ paused: true, onComplete: () => hold("intro", false) });
      if (!reduced) {
        const shown = order.slice(0, DEPTH.length).map((c) => cards[c]);
        intro
          .from(shown, { x: 120 * u, rotate: 4, autoAlpha: 0, duration: 1, stagger: { each: 0.12, from: "end" } })
          .from(quote(cards[order[0]])!.children, { y: 24 * u, autoAlpha: 0, duration: 0.7, stagger: 0.1 }, 0.5);
      }
      const enter = ScrollTrigger.create({ trigger: el, start: "top 70%", onEnter: () => intro.play() });
      const inView = ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onToggle: (self) => hold("view", !self.isActive) });

      // Swipe the front card: past a quarter of its width it is tossed that way, otherwise it springs back.
      let drag: { id: number; x0: number; dx: number; card: HTMLElement } | null = null;
      const onDown = contextSafe!((e: PointerEvent) => {
        const c = cards[order[0]];
        if (busy || !c.contains(e.target as Node) || (e.pointerType === "mouse" && e.button !== 0)) return;
        drag = { id: e.pointerId, x0: e.clientX, dx: 0, card: c };
        c.setPointerCapture(e.pointerId);
        hold("drag", true);
      });
      const onMove = contextSafe!((e: PointerEvent) => {
        if (!drag || e.pointerId !== drag.id) return;
        drag.dx = e.clientX - drag.x0;
        gsap.set(drag.card, { x: drag.dx, rotate: drag.dx * 0.03 });
      });
      const onUp = contextSafe!((e: PointerEvent) => {
        if (!drag || e.pointerId !== drag.id) return;
        const { dx, card: c } = drag;
        drag = null;
        if (Math.abs(dx) > c.offsetWidth / 4) step(1, dx > 0 ? 1 : -1);
        else gsap.to(c, { x: 0, rotate: 0, duration: 0.5, ease: "back.out(2)" });
        hold("drag", false);
      });

      const onEnter = () => hold("hover", true);
      const onLeave = () => hold("hover", false);
      const onFocusIn = () => hold("focus", true);
      const onFocusOut = (e: FocusEvent) => !el.contains(e.relatedTarget as Node) && hold("focus", false);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") step(1);
        else if (e.key === "ArrowLeft") step(-1);
      };
      const onVisibility = () => hold("hidden", document.hidden);

      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
      el.addEventListener("pointerenter", onEnter);
      el.addEventListener("pointerleave", onLeave);
      el.addEventListener("focusin", onFocusIn);
      el.addEventListener("focusout", onFocusOut);
      el.addEventListener("keydown", onKey);
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        enter.kill();
        inView.kill();
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
        el.removeEventListener("pointerenter", onEnter);
        el.removeEventListener("pointerleave", onLeave);
        el.removeEventListener("focusin", onFocusIn);
        el.removeEventListener("focusout", onFocusOut);
        el.removeEventListener("keydown", onKey);
        document.removeEventListener("visibilitychange", onVisibility);
        controls.current = null;
      };
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      data-for={mode}
      role="region"
      aria-roledescription="carousel"
      aria-label={words.region}
      className="w-707 shrink-0 max-md:w-full"
    >
      <div className="grid pt-32">
        {testimonials.map((t, i) => (
          <figure
            key={i}
            data-deck-card
            role="group"
            aria-roledescription="slide"
            aria-label={words.slide(i + 1, count)}
            aria-hidden={i !== front}
            inert={i !== front}
            style={{ zIndex: count - i }}
            // The Figma height is the least: a longer quote makes the card, and so the whole stack, taller.
            className={`relative [grid-area:1/1] min-h-381 w-707 origin-top touch-pan-y overflow-hidden select-none max-md:min-h-300 max-md:w-full ${card} ${
              i === front ? "cursor-grab active:cursor-grabbing" : ""
            }`}
          >
            <div data-quote className={`flex h-full flex-col justify-between gap-24 px-41 pt-32 pb-30 max-md:gap-32 max-md:p-24 ${i ? "invisible" : ""}`}>
              <blockquote className={`${quoteSize(t.quote)} font-semibold text-justify text-white max-md:text-left`}>{t.quote}</blockquote>
              <figcaption className="flex items-center gap-15">
                {t.avatar ? (
                  <Image
                    src={t.avatar}
                    alt=""
                    width={84}
                    height={84}
                    draggable={false}
                    className="size-84 rounded-full border-[calc(var(--s)*5)] border-midnight-50 object-cover opacity-80"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-84 shrink-0 items-center justify-center rounded-full border-[calc(var(--s)*5)] border-midnight-50 bg-midnight-500 font-display text-lead font-semibold text-midnight-50"
                  >
                    {initials(t.name)}
                  </span>
                )}
                <span className="flex flex-col gap-7 text-midnight-50">
                  <span className="text-lead font-semibold">{t.name}</span>
                  <span className="text-body">
                    {t.relation} - {t.role}
                  </span>
                </span>
              </figcaption>
            </div>
          </figure>
        ))}
      </div>

      <div data-deck-controls className="mt-40 flex items-center gap-24 max-md:mt-32 max-md:gap-16">
        <button type="button" onClick={() => controls.current?.step(-1)} aria-label={words.previous} className={`${round} hover:-translate-x-4`}>
          <Image src="/figma/icons/arrow-right-small.svg" alt="" width={36} height={36} unoptimized className="size-36 rotate-180 max-md:size-28" />
        </button>
        <div aria-hidden className="relative h-4 flex-1 overflow-hidden rounded-full bg-midnight-50/20">
          <span data-deck-progress className="absolute inset-0 origin-left scale-x-0 rounded-full bg-midnight-50 motion-reduce:hidden" />
        </div>
        <span aria-hidden className="font-display text-lead text-midnight-100 tabular-nums">
          {String(front + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
        <button type="button" onClick={() => controls.current?.step(1)} aria-label={words.next} className={`${round} hover:translate-x-4`}>
          <Image src="/figma/icons/arrow-right-small.svg" alt="" width={36} height={36} unoptimized className="size-36 max-md:size-28" />
        </button>
      </div>
    </div>
  );
}
