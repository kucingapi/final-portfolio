import type { CSSProperties } from "react";
import { Chip, Deco, Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { TransitionLink } from "@/components/transition/PageTransition";
import { ProjectArt } from "@/components/projects/ProjectArt";
import { featuredProjects } from "@/content/projects";

/**
 * Slots of the Figma grid, in reading order. Multimodal leads: AgentFlow takes the big tile,
 * multimodal.dev the tall one beside it. Each card is drawn at its design size and scaled as a
 * whole on phones (`--k`), so the crops stay as composed.
 */
const SLOTS = [
  { pos: "top-306 left-100", radius: "rounded-br-lg" },
  { pos: "top-306 left-950", radius: "rounded-bl-lg" },
  { pos: "top-1084 left-100", radius: "rounded-tr-lg" },
  { pos: "top-1084 left-527", radius: "rounded-tl-lg" },
];

/** The render is drawn wider than its card, so ask for an image as wide as the render, not the card. */
const artSizes = (imageW: number, cardW: number) =>
  `(max-width: 768px) ${Math.round((imageW / cardW) * 91)}vw, ${Math.round(imageW / 14.4)}vw`;

export function Projects() {
  return (
    <SectionMotion preset="projects">
      <section id="projects" aria-labelledby="projects-title" data-node-id="193:2317" className="relative overflow-clip bg-midnight-900">
        <div className="relative mx-auto h-1771 w-1440 max-md:h-auto max-md:w-full max-md:px-20 max-md:pt-110 max-md:pb-60">
          {/* Blue starburst: the lower half of the burst that rises out of the hero (193:2320) */}
          <div aria-hidden data-burst className="absolute -top-127 left-593 size-254 max-md:left-88">
            <div className="relative size-full">
              {[0, 30, 60, 90, 120, 150].map((deg) => (
                <span
                  key={deg}
                  className="absolute top-0 left-114 h-254 w-25 bg-midnight-500"
                  style={{ transform: `rotate(${deg}deg)` }}
                />
              ))}
            </div>
          </div>
          {/* Lower half of the striped circle from the hero (193:2333) */}
          <div data-spin className="absolute -top-68 left-1365 h-137 w-149 max-md:hidden">
            <Deco src="/figma/projects/striped-circle.svg" width={150} height={137} className="inset-0" bleed="-0.37% -0.34% -0.13% -0.34%" />
          </div>

          <div className="absolute top-22 left-101 max-md:static">
            <Heading className="" barTop="0.875em">
              <span id="projects-title">Projects</span>
            </Heading>
          </div>
          <p data-lines className="absolute top-143 left-100 w-760 text-h4 font-semibold text-midnight-100 max-md:static max-md:mt-12 max-md:w-full">
            Two years of building AgentFlow and multimodal.dev at Multimodal, and the work before it.
          </p>

          <ul data-grid className="max-md:mt-32 max-md:flex max-md:flex-col max-md:gap-16">
            {featuredProjects.map((project, i) => {
              const slot = SLOTS[i];
              const { w, h, place, mobileH } = project.card;
              return (
                <li
                  key={project.slug}
                  data-card
                  className={`absolute h-[calc(var(--s)*var(--h))] w-[calc(var(--s)*var(--w))] ${slot.pos} max-md:relative max-md:inset-auto max-md:h-[calc(var(--s)*var(--mh))] max-md:w-full`}
                  style={{ "--w": w, "--h": h, "--mh": mobileH, "--k": 390 / w } as CSSProperties}
                >
                  <TransitionLink
                    href={`/projects/${project.slug}`}
                    aria-label={`${project.title}, ${project.tag}: read the case study`}
                    className={`group absolute inset-0 block overflow-hidden bg-midnight-950 ${slot.radius} max-md:rounded-lg`}
                  >
                    <div className="absolute top-0 left-0 h-[calc(var(--s)*var(--h))] w-[calc(var(--s)*var(--w))] origin-top-left max-md:scale-(--k)">
                      <ProjectArt art={project.art} frame={{ w, h }} place={place} sizes={artSizes(place.w, w)} />
                    </div>
                    <span className="pointer-events-none absolute bottom-24 left-24 flex flex-wrap items-center gap-8 pr-24 max-md:bottom-14 max-md:left-14">
                      <Chip>{project.title}</Chip>
                      {/* Narrow cards keep only the title so the chips don't stack over the render. */}
                      {w > 500 && (
                        <span className="inline-flex h-40 items-center rounded-full border-2 border-midnight-50/70 bg-midnight-950/70 px-16 font-inter text-chip font-medium tracking-[-0.01em] whitespace-nowrap text-midnight-50 backdrop-blur-sm max-md:hidden">
                          {project.tag}
                        </span>
                      )}
                    </span>
                  </TransitionLink>
                </li>
              );
            })}
          </ul>

          <div data-more className="absolute top-1636 right-100 max-md:static max-md:mt-40 max-md:flex max-md:justify-center">
            <TransitionLink
              href="/projects"
              data-magnetic="8"
              className="inline-flex items-center gap-12 rounded-full border-2 border-midnight-50 px-28 py-10 text-lead font-semibold text-midnight-50 transition-colors hover:bg-midnight-50 hover:text-midnight-950"
            >
              View more projects
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
