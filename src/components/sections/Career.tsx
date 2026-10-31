import { Chip, Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { TransitionLink } from "@/components/transition/PageTransition";
import { SeamDecor } from "@/components/sections/Projects";
import { career } from "@/content/site";

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The home slot in Full-time mode: the career, newest first. Its heading and intro sit exactly where
 * Projects has them and the list starts where the project grid does, so switching modes reads as
 * one section changing its contents (see ModeSlot).
 */
export function Career() {
  return (
    <SectionMotion preset="career">
      <section id="career" data-for="fulltime" data-slot aria-labelledby="career-title" className="relative overflow-clip bg-midnight-900">
        <div className="relative mx-auto w-1440 pt-306 pb-140 max-md:w-full max-md:px-20 max-md:pt-110 max-md:pb-60">
          <SeamDecor />

          <div data-swap className="absolute top-22 left-101 max-md:relative max-md:inset-auto">
            <Heading barTop="0.875em">
              <span id="career-title">Career</span>
            </Heading>
          </div>
          <p data-swap data-lines className="absolute top-143 left-100 w-760 text-h4 font-semibold text-midnight-100 max-md:relative max-md:inset-auto max-md:mt-12 max-md:w-full">
            Two years at Multimodal, and the roles, programs and degree that led there.
          </p>

          <ol className="mx-100 flex flex-col max-md:mx-0 max-md:mt-32">
            {career.map((r) => (
              <li
                key={r.org + r.period}
                data-swap
                data-row
                className="grid grid-cols-[calc(var(--s)*250)_calc(var(--s)*430)_1fr] items-baseline gap-x-40 border-t-2 border-midnight-50/25 py-40 last:border-b-2 max-md:grid-cols-1 max-md:gap-y-10 max-md:py-24"
              >
                <p className="font-display text-lead font-semibold text-midnight-200 tabular-nums">{r.period}</p>
                <div className="flex flex-col items-start gap-8">
                  <h3 className="text-h4 font-semibold text-midnight-50">{r.org}</h3>
                  <p className="text-lead text-midnight-100">
                    {r.role}
                    {r.place && <span className="text-midnight-200"> · {r.place}</span>}
                  </p>
                  {r.kind && <Chip className="mt-6 h-32 px-12 text-[calc(var(--s)*13)]">{r.kind}</Chip>}
                </div>
                <div className="flex flex-col items-start gap-14 max-md:mt-6">
                  {r.points.map((point) => (
                    <p key={point} className="text-lead leading-[1.45] text-midnight-50">
                      {point}
                    </p>
                  ))}
                  {r.href && (
                    <TransitionLink href={r.href} className="group inline-flex items-center gap-10 text-lead font-semibold text-midnight-50">
                      Read the case study
                      <Arrow className="size-20 transition-transform duration-300 group-hover:translate-x-6" />
                    </TransitionLink>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div data-swap className="mx-100 mt-56 flex justify-end max-md:mx-0 max-md:mt-40 max-md:justify-center">
            <TransitionLink
              href="/career"
              data-magnetic="8"
              className="inline-flex items-center gap-12 rounded-full border-2 border-midnight-50 px-28 py-10 text-lead font-semibold text-midnight-50 transition-colors hover:bg-midnight-50 hover:text-midnight-950"
            >
              See my full career
              <Arrow className="size-22" />
            </TransitionLink>
          </div>
        </div>
      </section>
    </SectionMotion>
  );
}
