import { Heading } from "@/components/ui";
import { TailoredCareerList } from "@/components/career/TailoredCareerList";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { TransitionLink } from "@/components/transition/PageTransition";
import { SeamDecor } from "@/components/sections/Projects";
import { getCvContent, getSiteContent } from "@/lib/content/read";
import { linkRoles, roleLines } from "@/lib/cv/career";

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
export async function Career() {
  const [{ career }, cv] = await Promise.all([getSiteContent(), getCvContent()]);
  // A tailored link shows each role as its CV does: the same title, its top lines, in the CV's order.
  const links = linkRoles(career, cv);
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

          <TailoredCareerList roles={career} links={links} lines={roleLines(cv, links)} summary className="mx-100 max-md:mx-0 max-md:mt-32" />

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
