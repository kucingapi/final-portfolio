import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { TransitionLink } from "@/components/transition/PageTransition";
import { ProjectVisual } from "@/components/projects/ProjectVisual";
import { LetsTalk } from "@/components/sections/LetsTalk";
import { Footer } from "@/components/sections/Footer";
import {
  ProjectFilterProvider,
  ProjectFilterBar,
  FilterEmpty,
  FilterList,
  FilterSection,
  type FilterMeta,
} from "@/components/projects/ProjectFilter";
import {
  featuredProjects,
  moreProjects,
  projects,
  type Project,
} from "@/content/projects";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Case studies: AI products at Multimodal, client work, a thesis and side projects.",
};

/** Featured renders are composed for the 1240×700 case-study frame and scaled down here. */
const HERO = { w: 1240, h: 700 };
const CARD = { w: 600, h: 380 };

/** Everything a visitor might search for: names, client, what it is, and the tools. */
const filterMeta = (p: Project): FilterMeta => ({
  slug: p.slug,
  platform: p.platform,
  context: p.context,
  text: [
    p.title,
    p.fullName,
    p.client,
    p.kind,
    p.tag,
    p.year,
    p.role,
    p.summary,
    p.platform,
    p.context,
    ...p.stack,
  ].join(" "),
});

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

function Meta({ project }: { project: Project }) {
  return (
    <p className="flex flex-wrap items-center gap-x-12 gap-y-6 text-lead text-midnight-200">
      <span>
        {project.year} · {project.kind}
      </span>
      {project.status && (
        <span className="rounded-full border-2 border-midnight-200/60 px-12 py-2 text-chip font-semibold text-midnight-100">
          {project.status.label}
        </span>
      )}
    </p>
  );
}

function ReadMore() {
  return (
    <span className="inline-flex items-center gap-10 text-lead font-semibold text-midnight-50">
      Read the case study
      <Arrow className="size-22 transition-transform duration-300 group-hover:translate-x-8" />
    </span>
  );
}

export default function ProjectsPage() {
  return (
    <>
      <SectionMotion preset="index">
        <ProjectFilterProvider items={projects.map(filterMeta)}>
          <main>
            <section
              aria-labelledby="projects-title"
              className="relative overflow-clip bg-midnight-950"
            >
              <div className="relative mx-auto w-1240 pt-150 pb-160 max-md:w-full max-md:px-20 max-md:pt-110 max-md:pb-96">
                <h1
                  id="projects-title"
                  data-headline
                  className="text-h1 font-bold text-midnight-50 [text-box:trim-both_cap_alphabetic]"
                >
                  Projects
                </h1>
                <p
                  data-subline
                  className="mt-36 w-760 text-h4 font-semibold text-midnight-100 max-md:mt-24 max-md:w-full"
                >
                  Two years of AI products at Multimodal, then client work, my
                  thesis, and the things I build on the side. Each one has its
                  own case study.
                </p>

                <ProjectFilterBar />
                <FilterEmpty />

                <FilterList
                  className="mt-120 flex flex-col gap-120 max-md:mt-64 max-md:gap-72"
                  items={featuredProjects.map((project) => ({
                    slug: project.slug,
                    node: (
                      <TransitionLink
                        href={`/projects/${project.slug}`}
                        aria-label={`${project.title}: read the case study`}
                        className="group flex items-center gap-80 max-md:flex-col max-md:items-stretch max-md:gap-24 md:group-data-[flip=true]/row:flex-row-reverse"
                      >
                        <div className="relative h-406 w-720 shrink-0 overflow-hidden rounded-tr-lg bg-midnight-950 group-data-[flip=true]/row:rounded-tr-none group-data-[flip=true]/row:rounded-tl-lg max-md:h-[calc(var(--s)*220)] max-md:w-full">
                          <div className="absolute top-0 left-0 h-[calc(var(--s)*700)] w-[calc(var(--s)*1240)] origin-top-left scale-[calc(720/1240)] max-md:scale-[calc(390/1240)]">
                            <ProjectVisual
                              project={project}
                              frame={HERO}
                              sizes={`(max-width: 1023px) 100vw, ${Math.round(((project.hero.w / 1240) * 720) / 14.4)}vw`}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-20 max-md:gap-14">
                          <Meta project={project} />
                          <h2 className="text-h3 font-semibold text-midnight-50">
                            {project.title}
                          </h2>
                          <p className="text-lead leading-[1.45] text-midnight-100">
                            {project.summary}
                          </p>
                          <p className="mt-8 flex items-baseline gap-14">
                            <span className="font-display text-h4 leading-none font-semibold text-midnight-50 tabular-nums">
                              {project.stat.value}
                            </span>
                            <span className="text-body text-midnight-200">
                              {project.stat.label}
                            </span>
                          </p>
                          <span className="mt-8">
                            <ReadMore />
                          </span>
                        </div>
                      </TransitionLink>
                    ),
                  }))}
                />
              </div>
            </section>

            <FilterSection
              slugs={moreProjects.map((p) => p.slug)}
              aria-labelledby="more-title"
              className="relative"
            >
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-201 rounded-tl-[calc(var(--s)*1000)] bg-midnight-900 max-md:h-120"
              />
              <div
                aria-hidden
                className="absolute inset-x-0 top-200 -bottom-1 bg-midnight-900 max-md:top-119"
              />
              <div className="relative mx-auto w-1240 pt-110 pb-160 max-md:w-full max-md:px-20 max-md:pt-64 max-md:pb-96">
                <Heading
                  as="h2"
                  size="text-h3"
                  barTop="0.64em"
                  barHeight="0.6em"
                  barLeft="-0.1em"
                  barRight="-0.16em"
                >
                  <span id="more-title">More work</span>
                </Heading>
                <p
                  data-lines
                  className="mt-24 w-760 text-h4 font-semibold text-midnight-100 max-md:w-full"
                >
                  An app a neighbourhood waste bank runs on, a payroll tool for
                  a client, a review tool for a mortgage lender, my thesis, my
                  Bangkit capstone, and two apps I am building now.
                </p>

                <FilterList
                  className="mt-80 grid grid-cols-2 gap-x-40 gap-y-96 max-md:mt-48 max-md:grid-cols-1 max-md:gap-y-64"
                  items={moreProjects.map((project) => ({
                    slug: project.slug,
                    node: (
                      <TransitionLink
                        href={`/projects/${project.slug}`}
                        aria-label={`${project.title}: read the case study`}
                        className="group flex flex-col gap-24 max-md:gap-20"
                      >
                        <div className="relative h-380 w-600 overflow-hidden rounded-tr-lg group-data-[flip=true]/row:rounded-tr-none group-data-[flip=true]/row:rounded-tl-lg max-md:h-[calc(var(--s)*247)] max-md:w-full">
                          <div
                            className="absolute top-0 left-0 h-[calc(var(--s)*var(--h))] w-[calc(var(--s)*var(--w))] origin-top-left max-md:scale-[calc(390/600)]"
                            style={
                              { "--w": CARD.w, "--h": CARD.h } as CSSProperties
                            }
                          >
                            <ProjectVisual
                              project={project}
                              frame={CARD}
                              sizes="(max-width: 1023px) 100vw, 42vw"
                              footnote={project.stack.slice(0, 4).join(" · ")}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-14">
                          <Meta project={project} />
                          <h3 className="text-h4 font-semibold text-midnight-50">
                            {project.title}
                          </h3>
                          <p className="text-lead leading-[1.45] text-midnight-100">
                            {project.summary}
                          </p>
                          <span className="mt-6">
                            <ReadMore />
                          </span>
                        </div>
                      </TransitionLink>
                    ),
                  }))}
                />
              </div>
            </FilterSection>
          </main>
        </ProjectFilterProvider>
      </SectionMotion>
      <LetsTalk />
      <Footer />
    </>
  );
}
