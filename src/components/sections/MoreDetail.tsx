import { ArrowIcon, Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { TransitionLink } from "@/components/transition/PageTransition";
import { Downloads } from "@/components/cv/Downloads";
import { getSiteContent } from "@/lib/content/read";
import { getLang } from "@/lib/i18n/server";
import { ui } from "@/lib/i18n/ui";
import { MODES } from "@/lib/modes";

/** "More Detail" CTA band (Figma 245:2581). */
export async function MoreDetail() {
  const lang = await getLang();
  const { modes } = await getSiteContent(lang);
  return (
    <SectionMotion preset="detail">
      <section aria-labelledby="detail-title" data-node-id="245:2581" className="relative overflow-clip bg-midnight-900">
        {/* Tilted rounded panel whose top edge reads as a curve (249:2680) */}
        <div aria-hidden className="absolute -top-1 -left-24 flex h-951 w-1496 items-center justify-center max-md:-left-60 max-md:w-560">
          <div data-curve className="h-900 w-1465 flex-none -rotate-2 rounded-3xl border-2 border-midnight-50 bg-midnight-950 max-md:w-540" />
        </div>

        <div className="relative mx-auto h-440 w-1440 max-md:h-auto max-md:w-full max-md:px-20 max-md:pt-64 max-md:pb-48">
          <div className="absolute top-83 left-100 flex w-1240 items-center justify-between max-md:static max-md:w-full max-md:flex-col max-md:items-start max-md:gap-24">
            <div className="flex flex-col">
              <Heading size="text-h3" barTop="0.69em" barHeight="0.53em" barLeft="0" barRight="-0.1em">
                <span id="detail-title" className="text-white">{ui(lang).home.detail}</span>
              </Heading>
              {MODES.map((m) => (
                <p key={m} data-for={m} data-lines className="w-813 text-h4 font-semibold text-justify text-midnight-100 max-md:w-full max-md:text-left">
                  {modes[m].detail.body}
                </p>
              ))}
              <Downloads className="mt-32 max-md:mt-24" />
            </div>
            {/* Each mode points at the other side of the site: Freelance at the career, Full-time at the projects, Speaker / Teacher at the career. */}
            {MODES.map((m) => (
              <TransitionLink
                key={m}
                data-for={m}
                href={modes[m].detail.href}
                aria-label={modes[m].detail.cta}
                data-cta
                data-magnetic="14"
                className="flex size-96 shrink-0 items-center justify-center rounded-[calc(var(--s)*24.67)] bg-midnight-500 transition-colors hover:bg-midnight-400 max-md:self-end"
              >
                <ArrowIcon className="size-72" />
              </TransitionLink>
            ))}
          </div>
        </div>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-white" />
      </section>
    </SectionMotion>
  );
}
