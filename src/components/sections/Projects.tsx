import { Deco, Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { TransitionLink } from "@/components/transition/PageTransition";
import { LeadGrid } from "@/components/projects/LeadGrid";
import { hasArt } from "@/content/projects";
import { getProjects } from "@/lib/content/read";
import { getLang } from "@/lib/i18n/server";
import { ui } from "@/lib/i18n/ui";

/**
 * Where the hero meets the home slot: the lower half of the blue starburst rising out of the hero
 * (193:2320) and of the striped circle (193:2333). Projects and Career (one per mode) both carry it.
 */
export function SeamDecor() {
  return (
    <>
      <div aria-hidden data-burst className="absolute -top-127 left-593 size-254 max-md:left-88">
        <div className="relative size-full">
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <span key={deg} className="absolute top-0 left-114 h-254 w-25 bg-midnight-500" style={{ transform: `rotate(${deg}deg)` }} />
          ))}
        </div>
      </div>
      <div data-spin className="absolute -top-68 left-1365 h-137 w-149 max-md:hidden">
        <Deco src="/figma/projects/striped-circle.svg" width={150} height={137} className="inset-0" bleed="-0.37% -0.34% -0.13% -0.34%" />
      </div>
    </>
  );
}

/**
 * The four projects that lead (see LeadGrid): the site's first four, or the ones a tailored link puts
 * first. Every project with a render can take any card, so only what a card needs goes to the browser.
 */
export async function Projects() {
  const lang = await getLang();
  const t = ui(lang).home.projects;
  const projects = (await getProjects(lang)).filter(hasArt).map(({ slug, title, tag, card, hero, art }) => ({ slug, title, tag, card, hero, art }));
  return (
    <SectionMotion preset="projects">
      <section id="projects" data-for="freelance" data-slot aria-labelledby="projects-title" data-node-id="193:2317" className="relative overflow-clip bg-midnight-900">
        <div className="relative mx-auto h-1771 w-1440 max-md:h-auto max-md:w-full max-md:px-20 max-md:pt-110 max-md:pb-60">
          <SeamDecor />

          <div data-swap className="absolute top-22 left-101 max-md:relative max-md:inset-auto">
            <Heading className="" barTop="0.875em">
              <span id="projects-title">{t.heading}</span>
            </Heading>
          </div>
          {/* Says what the whole body of work is, so it holds whichever four projects a link puts first. */}
          <p data-swap data-lines className="absolute top-143 left-100 w-760 text-h4 font-semibold text-midnight-100 max-md:relative max-md:inset-auto max-md:mt-12 max-md:w-full">
            {t.intro}
          </p>

          <LeadGrid projects={projects} />

          <div data-more data-swap className="absolute top-1636 right-100 max-md:static max-md:mt-40 max-md:flex max-md:justify-center">
            <TransitionLink
              href="/projects"
              data-magnetic="8"
              className="inline-flex items-center gap-12 rounded-full border-2 border-midnight-50 px-28 py-10 text-lead font-semibold text-midnight-50 transition-colors hover:bg-midnight-50 hover:text-midnight-950"
            >
              {t.more}
              <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-22">
                <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </TransitionLink>
          </div>
        </div>
      </section>
    </SectionMotion>
  );
}
