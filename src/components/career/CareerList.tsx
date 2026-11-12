import { Chip } from "@/components/ui";
import { TransitionLink } from "@/components/transition/PageTransition";
import type { CareerRole } from "@/content/site";
import { useUi } from "@/lib/i18n/client";
import { CareerCursor } from "./CareerCursor";

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M4 12h15m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Career timeline rows: when, where and as what, then what I did there. Shared by the home Career
 * section and the Career page so both read the same. Rows carry `data-row` (scroll reveal),
 * `data-swap` (the home mode swap) and, when they open a case study, `data-preview` (the cursor label).
 */
export function CareerList({
  roles,
  className = "",
}: {
  roles: CareerRole[];
  className?: string;
}) {
  const t = useUi().career;
  return (
    // Only rows that open a case study get the cursor label, so it always means "you can click".
    <CareerCursor>
      <ol className={`flex flex-col ${className}`}>
        {roles.map((r) => (
          <li
            // Not the title: a tailored link can change it, and the row should stay the same row.
            key={r.org + r.period}
            data-swap
            data-row
            data-preview={r.href ? "" : undefined}
            className="relative grid grid-cols-[calc(var(--s)*250)_calc(var(--s)*430)_1fr] items-baseline gap-x-40 border-t-2 border-midnight-50/25 py-40 last:border-b-2 max-md:grid-cols-1 max-md:gap-y-10 max-md:py-24"
          >
            <p className="font-display text-lead font-semibold text-midnight-200 tabular-nums">
              {r.period}
            </p>
            <div className="flex flex-col items-start gap-8">
              <h3 className="text-h4 font-semibold text-midnight-50">
                {r.org}
              </h3>
              <p className="text-lead text-midnight-100">
                {r.role}
                {r.place && (
                  <span className="text-midnight-200"> · {r.place}</span>
                )}
              </p>
              {r.kind && (
                <Chip className="mt-6 h-32 px-12 text-[max(11px,calc(var(--s)*13))]">
                  {t.kinds[r.kind] ?? r.kind}
                </Chip>
              )}
            </div>
            <div className="flex flex-col items-start gap-14 max-md:mt-6">
              {r.points.map((point) => (
                <p
                  key={point}
                  className="text-lead leading-[1.45] text-midnight-50"
                >
                  {point}
                </p>
              ))}
              {r.proof && (
                // Above the row's stretched case-study link, so this click opens the certificate.
                <a
                  href={r.proof}
                  target="_blank"
                  rel="noreferrer"
                  className="relative z-10 text-lead font-semibold text-midnight-50 underline underline-offset-4 hover:text-midnight-200"
                >
                  {t.seeProof}
                </a>
              )}
              {r.href && (
                <TransitionLink
                  href={r.href}
                  // Stretched over the whole row, so anywhere on it opens the case study.
                  className="group inline-flex items-center gap-10 text-lead font-semibold text-midnight-50 after:absolute after:inset-0 after:content-['']"
                >
                  {t.readCase}
                  <Arrow className="size-20 transition-transform duration-300 group-hover:translate-x-6" />
                </TransitionLink>
              )}
            </div>
          </li>
        ))}
      </ol>
    </CareerCursor>
  );
}
