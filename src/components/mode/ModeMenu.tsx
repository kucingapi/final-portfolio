"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useUi } from "@/lib/i18n/client";
import { MODES, type Mode } from "@/lib/modes";
import { useMode } from "./Mode";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`size-16 shrink-0 transition-transform duration-300 max-md:size-14 ${open ? "rotate-180" : ""}`}>
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-18 shrink-0">
      <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The navbar's mode switch: a drop-down listing Freelance, Full-time and Speaker / Teacher. The button
 * shows the current mode (every label is in the page and CSS shows the one for <html data-mode>, so the
 * first paint is right); the list is a listbox with the usual keys: arrows, Home/End, Enter or Space to
 * pick, Escape to close.
 */
export function ModeMenu({ labels, className = "" }: { labels: Record<Mode, string>; className?: string }) {
  const { mode, setMode } = useMode();
  const t = useUi();
  const uid = useId();
  const listId = `${uid}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const close = (focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) trigger.current?.focus();
  };
  const show = (index = MODES.indexOf(mode)) => {
    setActive(index);
    setOpen(true);
    requestAnimationFrame(() => list.current?.focus({ preventScroll: true }));
  };
  const pick = (m: Mode) => {
    close(true);
    setMode(m);
  };

  // A press outside, or scrolling the page, closes it.
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const scrolled = () => setOpen(false);
    document.addEventListener("pointerdown", away);
    window.addEventListener("scroll", scrolled, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("scroll", scrolled);
    };
  }, [open]);

  const onTriggerKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      show();
    }
  };

  const onListKey = (e: KeyboardEvent) => {
    const last = MODES.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => (a >= last ? 0 : a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => (a <= 0 ? last : a - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        pick(MODES[active]);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${t.nav.viewAs}: ${labels[mode]}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={onTriggerKey}
        className="inline-flex items-center gap-8 rounded-full border-2 border-midnight-50/50 px-20 py-8 font-inter text-chip font-semibold tracking-[-0.01em] whitespace-nowrap text-midnight-50 transition-colors duration-300 hover:border-midnight-50 max-md:gap-6 max-md:px-12 max-md:py-6"
      >
        <span className="text-midnight-200 max-md:hidden">{t.nav.viewAs}</span>
        {MODES.map((m) => (
          <span key={m} data-for={m}>
            {labels[m]}
          </span>
        ))}
        <Chevron open={open} />
      </button>

      <ul
        ref={list}
        id={listId}
        role="listbox"
        tabIndex={-1}
        aria-label={t.nav.viewAs}
        aria-activedescendant={open ? `${uid}-${MODES[active]}` : undefined}
        onKeyDown={onListKey}
        className={`absolute top-[calc(100%+var(--s)*12)] right-0 z-10 w-max min-w-full origin-top-right rounded-[calc(var(--s)*24)] border-2 border-midnight-50/50 bg-midnight-950 p-6 shadow-[0_calc(var(--s)*24)_calc(var(--s)*48)_rgb(1_3_38/0.5)] transition-[opacity,translate,scale] duration-300 ease-[var(--ease-out)] focus:outline-none motion-reduce:transition-none max-md:min-w-[calc(var(--s)*240)] ${
          open ? "visible translate-y-0 scale-100 opacity-100" : "pointer-events-none invisible -translate-y-8 scale-95 opacity-0"
        }`}
      >
        {MODES.map((m, i) => {
          const selected = m === mode;
          return (
            <li
              key={m}
              id={`${uid}-${m}`}
              role="option"
              aria-selected={selected}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(m)}
              className={`flex cursor-pointer items-center justify-between gap-24 rounded-[calc(var(--s)*18)] px-16 py-10 transition-colors duration-200 ${
                selected ? "bg-midnight-50 text-midnight-950" : i === active ? "bg-midnight-50/10 text-midnight-50" : "text-midnight-50"
              }`}
            >
              <span className="flex flex-col gap-2">
                <span className="font-inter text-chip font-semibold tracking-[-0.01em]">{labels[m]}</span>
                <span className="font-inter text-[max(11px,calc(var(--s)*13))] opacity-70">{t.nav.modeHints[m]}</span>
              </span>
              {selected && <Check />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
