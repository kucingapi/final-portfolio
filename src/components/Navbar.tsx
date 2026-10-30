"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { useLenis } from "@/components/providers/SmoothScroll";
import { TransitionLink, onPageReveal } from "@/components/transition/PageTransition";
import { site, mailHref, telHref } from "@/content/site";

const MENU = [
  { label: "Home", href: "/", icon: "/figma/nav/icon-home.svg" },
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
      if (reduced) {
        tl.from(menu.current, { autoAlpha: 0, duration: 0.2 });
      } else {
        tl.from("[data-menu-backdrop]", { autoAlpha: 0, duration: 0.6, ease: "power2.out" }, 0)
          .from("[data-menu-panel]", { yPercent: -110, duration: 0.7, ease: "power4.inOut" }, 0)
          .from("[data-menu-item]", { yPercent: 120, duration: 0.7, stagger: 0.08 }, 0.3)
          .fromTo("[data-menu-icon]", { scale: 0, rotate: -20 }, { scale: 1, rotate: 0, duration: 0.6, stagger: 0.08, ease: "back.out(2)" }, 0.4)
          .from("[data-menu-contact]", { autoAlpha: 0, y: 20, duration: 0.5 }, 0.5)
          .from("[data-menu-close]", { rotate: -90, autoAlpha: 0, duration: 0.5 }, 0.3);
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
      <header ref={bar} className="fixed inset-x-0 top-0 z-50 invisible" data-node-id="348:12162">
        <div className="container-x flex h-100 items-center justify-between max-md:h-64">
          <TransitionLink href="/" aria-label={`${site.name} — home`} className="flex items-end gap-20 max-md:gap-12">
            <Logo />
            <span className="font-display text-clock tracking-[-0.005em] whitespace-nowrap text-white" suppressHydrationWarning>
              <span className={time ? "" : "invisible"}>{time ?? "0:00 AM"}</span> (GMT+7)
            </span>
          </TransitionLink>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label="Open menu"
            className="group relative size-110 max-md:size-56"
          >
            <span className="absolute top-[38.18%] left-[24.55%] h-[4.55%] w-1/2 rounded-full bg-white transition-transform duration-300 group-hover:-translate-x-[12%]" />
            <span className="absolute top-[58.18%] left-[24.55%] h-[4.55%] w-1/2 rounded-full bg-white transition-transform duration-300 group-hover:translate-x-[12%]" />
          </button>
        </div>
      </header>

      <div
        ref={menu}
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        inert={!open}
        className="invisible fixed inset-0 z-[60] overflow-hidden"
        data-node-id="314:260"
      >
        {/* The panel drops over the current page; the page stays visible below it and a click there closes the menu. */}
        <div data-menu-backdrop aria-hidden onClick={() => setOpen(false)} className="absolute inset-0 bg-midnight-950/30" />
        <div data-menu-panel className="absolute -top-141 -left-83 h-728 w-1569 drop-shadow-[0_calc(var(--s)*24)_calc(var(--s)*48)_rgb(1_3_38/0.5)] max-md:-top-60 max-md:h-560">
          <Image
            src="/figma/nav/panel.svg"
            alt=""
            width={1523}
            height={597}
            className="absolute top-1/2 left-1/2 h-597 w-1523 max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-5 max-md:h-460"
          />
        </div>

        <nav className="absolute top-60 left-40 origin-top-left -rotate-5 max-md:top-90 max-md:left-24">
          <ul className="flex flex-col gap-17 max-md:gap-12">
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
                    className="size-119 max-md:size-56"
                  />
                  </span>
                  <span className="text-h1 font-bold transition-transform duration-300 group-hover:translate-x-12">{item.label}</span>
                </TransitionLink>
              </li>
            ))}
          </ul>
        </nav>

        <div data-menu-contact className="absolute top-262 left-1046 origin-top-left -rotate-5 text-white max-md:top-540 max-md:left-34 max-md:rotate-0">
          <p className="text-h4 font-semibold">Get in touch</p>
          <div className="mt-21 flex flex-col gap-11 text-lead font-semibold max-md:mt-12">
            <a href={mailHref} className="hover:underline">{site.email}</a>
            <a href={telHref} className="hover:underline">{site.phone}</a>
          </div>
        </div>

        <button
          type="button"
          data-menu-close
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute top-0 right-100 size-110 transition-transform duration-300 hover:rotate-90 max-md:top-4 max-md:right-20 max-md:size-56"
        >
          <span className="absolute top-1/2 left-1/2 h-[4.5%] w-1/2 -translate-1/2 rotate-45 rounded-full bg-white" />
          <span className="absolute top-1/2 left-1/2 h-[4.5%] w-1/2 -translate-1/2 -rotate-45 rounded-full bg-white" />
        </button>
      </div>
    </>
  );
}
