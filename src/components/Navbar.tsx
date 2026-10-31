"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useLenis } from "@/components/providers/SmoothScroll";
import { TransitionLink, onPageReveal } from "@/components/transition/PageTransition";
import { site, mailHref, telHref } from "@/content/site";

const MENU = [
  { label: "Home", href: "/", icon: "/figma/nav/icon-home.svg" },
  { label: "Projects", href: "/projects", icon: "/figma/nav/icon-projects.svg" },
  { label: "Experiences", href: "/experiences", icon: "/figma/nav/icon-experiences.svg" },
  { label: "Contact", href: "/contact", icon: "/figma/nav/icon-contact.svg" },
];

function useJakartaTime() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZone: site.timeZone, hour: "numeric", minute: "2-digit" });
    const update = () => setTime(fmt.format(new Date()));
    update();
    const id = setInterval(update, 15_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-end ${className}`}>
      <Image src="/figma/brand/logo.svg" alt="" width={39} height={42} className="h-42 w-39 max-md:h-28 max-md:w-26" />
      <span className="ml-5 font-display text-body leading-[1.5] font-bold text-white max-md:ml-3">.</span>
    </span>
  );
}

/** Navbar (Figma 348:12162) with the drop-down menu overlay (Figma "Open" 314:260). */
export function Navbar() {
  const time = useJakartaTime();
  const lenis = useLenis();
  const [open, setOpen] = useState(false);
  const bar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const lineTop = useRef<HTMLSpanElement>(null);
  const lineBottom = useRef<HTMLSpanElement>(null);
  const menuTl = useRef<gsap.core.Timeline | null>(null);

  // Load-in + hide on scroll down / show on scroll up.
  useGSAP(() => {
    gsap.set(bar.current, { autoAlpha: 0, yPercent: -40 });
    const off = onPageReveal(() => gsap.to(bar.current, { autoAlpha: 1, yPercent: 0, duration: 0.8, delay: 0.6 }));
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const hide = self.direction === 1 && self.scroll() > 100;
        gsap.to(bar.current, { yPercent: hide ? -110 : 0, duration: 0.4, ease: "power3.out", overwrite: "auto" });
      },
    });
    return () => {
      off();
      st.kill();
    };
  });

  // Menu open/close timeline.
  useGSAP(
    () => {
      const reduced = prefersReducedMotion();
      const tl = gsap.timeline({ paused: true });
      tl.set(menu.current, { autoAlpha: 1 });
      // The hamburger's two lines slide together onto the middle, then cross into an X
      // (and play backwards on close). The y offsets move each line's centre to 50%.
      tl.to(lineTop.current, { yPercent: 210, duration: reduced ? 0.1 : 0.3, ease: "power2.in" }, 0)
        .to(lineBottom.current, { yPercent: -230, duration: reduced ? 0.1 : 0.3, ease: "power2.in" }, 0)
        // Shorter, slightly bolder arms keep the X compact and as heavy as the logo beside it.
        .to(lineTop.current, { rotate: 45, scaleX: 0.8, scaleY: 1.25, duration: reduced ? 0.1 : 0.5, ease: reduced ? "none" : "back.out(2)" }, reduced ? 0.1 : 0.3)
        .to(lineBottom.current, { rotate: -45, scaleX: 0.8, scaleY: 1.25, duration: reduced ? 0.1 : 0.5, ease: reduced ? "none" : "back.out(2)" }, reduced ? 0.1 : 0.3);
      if (reduced) {
        tl.from(menu.current, { autoAlpha: 0, duration: 0.2 }, 0);
      } else {
        tl.from("[data-menu-backdrop]", { autoAlpha: 0, duration: 0.6, ease: "power2.out" }, 0)
          .from("[data-menu-panel]", { yPercent: -110, duration: 0.7, ease: "power4.inOut" }, 0)
          .from("[data-menu-item]", { yPercent: 120, duration: 0.7, stagger: 0.08 }, 0.3)
          .fromTo("[data-menu-icon]", { scale: 0, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.6, stagger: 0.08, ease: "back.out(2)" }, 0.4)
          .from("[data-menu-contact]", { autoAlpha: 0, y: 20, duration: 0.5 }, 0.5);
      }
      menuTl.current = tl;
    },
    { scope: menu },
  );

  useEffect(() => {
    const tl = menuTl.current;
    if (!tl) return;
    if (open) {
      lenis.current?.stop();
      document.documentElement.style.overflow = "hidden";
      // The bar stays on top of the open menu, so bring it back if scrolling had tucked it away.
      gsap.to(bar.current, { yPercent: 0, duration: 0.4, ease: "power3.out", overwrite: "auto" });
      tl.timeScale(1).play();
    } else {
      lenis.current?.start();
      document.documentElement.style.overflow = "";
      tl.timeScale(1.25).reverse();
    }
  }, [open, lenis]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Sits above the menu overlay (z-70 vs z-60) so the logo, clock and toggle stay put when it opens. */}
      <header ref={bar} className="fixed inset-x-0 top-0 z-[70] invisible" data-node-id="348:12162">
        <div className="container-x flex h-100 items-center justify-between max-md:h-64">
          <TransitionLink
            href="/"
            onClick={() => setOpen(false)}
            aria-label={`${site.name} — home`}
            className="flex items-end gap-20 max-md:gap-12"
          >
            <Logo />
            <span className="font-display text-clock tracking-[-0.005em] whitespace-nowrap text-white" suppressHydrationWarning>
              <span className={time ? "" : "invisible"}>{time ?? "0:00 AM"}</span> (GMT+7)
            </span>
          </TransitionLink>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative size-110 transition-[rotate] duration-300 aria-expanded:hover:rotate-90 max-md:size-56"
          >
            {/*
              GSAP morphs the outer spans into the X (see the menu timeline); the hover nudge lives on the
              inner bars and only while closed. They must stay on separate elements: GSAP folds any CSS
              `translate` it finds into its own transform, which would bake the nudge into the X.
            */}
            <span ref={lineTop} className="absolute top-[38.18%] left-[24.55%] h-[4.55%] w-1/2">
              <span className="block size-full rounded-full bg-white transition-[translate] duration-300 [[aria-expanded=false]:hover_&]:-translate-x-[12%]" />
            </span>
            <span ref={lineBottom} className="absolute top-[58.18%] left-[24.55%] h-[4.55%] w-1/2">
              <span className="block size-full rounded-full bg-white transition-[translate] duration-300 [[aria-expanded=false]:hover_&]:translate-x-[12%]" />
            </span>
          </button>
        </div>
      </header>

      <div
        ref={menu}
        id="site-menu"
        role="dialog"
        aria-label="Site menu"
        inert={!open}
        className="invisible fixed inset-0 z-[60] overflow-hidden"
        data-node-id="314:260"
      >
        {/* The panel drops over the current page; the page stays visible below it and a click there closes the menu. */}
        <div data-menu-backdrop aria-hidden onClick={() => setOpen(false)} className="absolute inset-0 bg-midnight-950/30" />
        {/*
          The panel spans the full viewport on any screen width (the SVG stretches freely). On desktop it
          also runs 200px higher than the Figma one so the tilt never shows its top corners on wide screens,
          and 80px lower so the links clear the navbar sitting on top. Its bottom edge sits 80px below
          Figma's (100px on phones) so a fourth link, Projects, fits.
        */}
        <div
          data-menu-panel
          className="absolute -top-341 left-1/2 h-1088 w-[max(calc(var(--s)*1569),calc(100vw+var(--s)*160))] -translate-x-1/2 drop-shadow-[0_calc(var(--s)*24)_calc(var(--s)*48)_rgb(1_3_38/0.5)] max-md:-top-60 max-md:-left-83 max-md:h-700 max-md:w-1569 max-md:translate-x-0"
        >
          <Image
            src="/figma/nav/panel.svg"
            alt=""
            width={1523}
            height={597}
            className="absolute top-1/2 left-1/2 h-957 w-[calc(100%-var(--s)*46)] max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-5 max-md:h-600"
          />
        </div>

        {/* Links and contact keep their Figma spots inside a centred 1440 frame, in line with the navbar. */}
        <div className="pointer-events-none relative mx-auto h-full w-1440 *:pointer-events-auto max-md:w-full">
          <nav className="absolute top-140 left-40 origin-top-left -rotate-5 max-md:top-90 max-md:left-24">
            <ul className="flex flex-col gap-6 max-md:gap-8">
              {MENU.map((item) => (
                <li key={item.href} className="line-mask">
                  <TransitionLink
                    href={item.href}
                    onClick={() => setOpen(false)}
                    data-menu-item
                    className="group flex items-center gap-10 p-10 text-midnight-950"
                  >
                    <span className="transition-[rotate] duration-300 group-hover:rotate-[-8deg]">
                    <Image
                      data-menu-icon
                      src={item.icon}
                      alt=""
                      width={119}
                      height={119}
                      className="size-96 max-md:size-48"
                    />
                    </span>
                    <span className="text-h2 font-bold transition-transform duration-300 group-hover:translate-x-12 max-md:text-h1">{item.label}</span>
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </nav>

          <div data-menu-contact className="absolute top-322 left-1046 origin-top-left -rotate-5 text-white max-md:top-462 max-md:left-34 max-md:rotate-0">
            <p className="text-h4 font-semibold">Get in touch</p>
            <div className="mt-21 flex flex-col gap-11 text-lead font-semibold max-md:mt-12">
              <a href={mailHref} className="hover:underline">{site.email}</a>
              <a href={telHref} className="hover:underline">{site.phone}</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
