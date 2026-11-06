"use client";

import { useVariant } from "./Variant";
import { track } from "@/lib/analytics";
import { useLang, useUi } from "@/lib/i18n/client";

/**
 * The CV and the portfolio deck as downloads. Both follow the visitor's tailored link when there is
 * one: the CV picks its lines from the variant, the deck its three projects.
 */

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-20">
      <path d="M12 4v12m0 0-5-5m5 5 5-5M5 20h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const pill = "inline-flex items-center gap-12 rounded-full px-28 py-12 text-lead font-semibold transition-colors";

export function Downloads({ className = "" }: { className?: string }) {
  const { current } = useVariant();
  const lang = useLang();
  const t = useUi().cv;
  // The PDFs come in the page's language, whatever language the link was made in.
  const q = (current ? `&v=${current.code}` : "") + `&lang=${lang}`;
  const tailored = Boolean(current);
  return (
    <div className={`flex flex-wrap gap-16 ${className}`}>
      <a
        href={`/api/cv?download=1${q}`}
        onClick={() => track("cv_downloaded", { tailored, from: "downloads", lang })}
        className={`${pill} bg-midnight-50 text-midnight-950 hover:bg-white`}
      >
        {t.download}
        <DownloadIcon />
      </a>
      <a
        href={`/api/portfolio?download=1${q}`}
        onClick={() => track("portfolio_downloaded", { tailored, lang })}
        className={`${pill} border-2 border-midnight-50 text-midnight-50 hover:bg-midnight-50 hover:text-midnight-950`}
      >
        {t.downloadPortfolio}
        <DownloadIcon />
      </a>
    </div>
  );
}
