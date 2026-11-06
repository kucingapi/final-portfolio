"use client";

import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { track } from "@/lib/analytics";
import { useLang, useUi } from "@/lib/i18n/client";
import { LANGS, LANG_NAMES, LOCALES, localePath, splitLang, type Lang } from "@/lib/i18n/lang";

/**
 * English / Bahasa Indonesia: the same page in the other language. Plain links, so they work before the
 * scripts load and search engines follow them; a click also carries the address's parameters along
 * (the projects filter, ?mode=). Switching loads the page fresh, as each language is its own root.
 */
export function LangSwitch({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const lang = useLang();
  const t = useUi();
  // The prerendered page knows itself as /en/…; the browser shows /…. Either way the page is `path`.
  const { path } = splitLang(usePathname());

  const go = (e: MouseEvent<HTMLAnchorElement>, to: Lang) => {
    if (to === lang) return e.preventDefault();
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    track("language_switched", { to });
    window.location.assign(localePath(to, path) + window.location.search + window.location.hash);
  };

  const light = tone === "light";
  return (
    <nav aria-label={t.nav.language} className={`relative grid grid-cols-2 rounded-full border-2 p-4 ${light ? "border-midnight-950/40" : "border-midnight-50/50"} ${className}`}>
      <span
        aria-hidden
        className={`absolute inset-y-4 left-4 w-[calc(50%-var(--s)*4)] rounded-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${light ? "bg-midnight-950" : "bg-midnight-50"}`}
        style={{ transform: lang === "id" ? "translateX(100%)" : "none" }}
      />
      {LANGS.map((l) => (
        <a
          key={l}
          href={localePath(l, path)}
          hrefLang={LOCALES[l]}
          lang={LOCALES[l]}
          title={LANG_NAMES[l]}
          aria-label={LANG_NAMES[l]}
          aria-current={l === lang ? "true" : undefined}
          onClick={(e) => go(e, l)}
          className={`relative z-10 rounded-full px-14 py-8 text-center font-inter text-chip font-semibold tracking-[-0.01em] uppercase transition-colors duration-300 max-md:px-12 max-md:py-6 ${
            l === lang ? (light ? "text-midnight-50" : "text-midnight-950") : light ? "text-midnight-950 hover:text-midnight-700" : "text-midnight-50 hover:text-white"
          }`}
        >
          {l}
        </a>
      ))}
    </nav>
  );
}
