import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { TransitionLink } from "@/components/transition/PageTransition";
import { ProjectVisual, visualWidth } from "@/components/projects/ProjectVisual";
import { ProjectStat } from "@/components/projects/ProjectStat";
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
import { hasArt, statOf, type Project } from "@/content/projects";
import { getProjects } from "@/lib/content/read";
import type { Lang } from "@/lib/i18n/lang";
import { alternates } from "@/lib/i18n/meta";
import { getLang } from "@/lib/i18n/server";
import { ui, type Ui } from "@/lib/i18n/ui";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = ui(lang).meta.projects;
  return { title: t.title, description: t.description, alternates: alternates(lang, "/projects") };
}

/** The leading rows draw the 1240×700 case-study frame and scale it down; the cards below are 600×380. */
const HERO = { w: 1240, h: 700 };
const CARD = { w: 600, h: 380 };

/**
 * Image sizes for a visual drawn `w` design px wide (a render is drawn wider than its frame). Rows show
 * the 1240 frame at 720 (390 on phones), cards at 600 (390 on phones); the design stops growing at 1440.
 */
const rowSizes = (w: number) =>
  `(max-width: 1023px) ${Math.round((w / 1240) * 91)}vw, (min-width: 1440px) ${Math.round((w / 1240) * 720)}px, ${Math.round(((w / 1240) * 720) / 14.4)}vw`;
const cardSizes = (w: number) =>
  `(max-width: 1023px) ${Math.round((w / CARD.w) * 91)}vw, (min-width: 1440px) ${Math.round(w)}px, ${Math.round(w / 14.4)}vw`;

/** Everything a visitor might search for: names, client, what it is, and the tools, in the page's words. */
const filterMeta = (p: Project, t: Ui): FilterMeta => ({
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
    t.filter.contexts[p.context],
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

/** Each chapter's figure as a headline stat, for a tailored link to choose from. */
const figures = (p: Project) =>
  Object.fromEntries(p.chapters.filter((c) => c.figure).map((c) => [c.id, statOf(p, c.id)]));

function ReadMore({ lang }: { lang: Lang }) {
  return (
    <span className="inline-flex items-center gap-10 text-lead font-semibold text-midnight-50">
      {ui(lang).project.readCase}
      <Arrow className="size-22 transition-transform duration-300 group-hover:translate-x-8" />
    </span>
  );
}

export default async function ProjectsPage() {
  const lang = await getLang();
  const t = ui(lang);
  const projects = await getProjects(lang);
  // Every project is drawn both ways, as a large row and as a card. The four that lead for this visitor
  // (the site's first four with a render, or a tailored link's) show as rows, the rest as cards.
  return (
    <>
      <SectionMotion preset="index">
        <ProjectFilterProvider items={projects.map((p) => filterMeta(p, t))}>
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
                  {t.projects.heading}
                </h1>
                <p
                  data-subline
                  className="mt-36 w-760 text-h4 font-semibold text-midnight-100 max-md:mt-24 max-md:w-full"
                >
                  {t.projects.intro}
                </p>

                <ProjectFilterBar />
                <FilterEmpty />

                <FilterList
                  pick="lead"
                  className="mt-120 flex flex-col gap-120 max-md:mt-64 max-md:gap-72"
                  items={projects.map((project) => ({
                    slug: project.slug,
                    art: hasArt(project),
                    node: (
                      <TransitionLink
                        href={`/projects/${project.slug}`}
                        aria-label={t.project.readCaseLabel(project.title)}
                        className="group flex items-center gap-80 max-md:flex-col max-md:items-stretch max-md:gap-24 md:group-data-[flip=true]/row:flex-row-reverse"
                      >
                        <div className="relative h-406 w-720 shrink-0 overflow-hidden rounded-tr-lg bg-midnight-950 group-data-[flip=true]/row:rounded-tr-none group-data-[flip=true]/row:rounded-tl-lg max-md:h-[calc(var(--s)*220)] max-md:w-full">
                          <div className="absolute top-0 left-0 h-[calc(var(--s)*700)] w-[calc(var(--s)*1240)] origin-top-left scale-[calc(720/1240)] max-md:scale-[calc(390/1240)]">
                            <ProjectVisual
                              project={project}
                              frame={HERO}
                              sizes={rowSizes(visualWidth(project, HERO))}
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
                          <ProjectStat slug={project.slug} stat={project.stat} figures={figures(project)} />
                          <span className="mt-8">
                            <ReadMore lang={lang} />
                          </span>
                        </div>
                      </TransitionLink>
                    ),
                  }))}
                />
              </div>
            </section>

            <FilterSection
              items={projects.map((p) => ({ slug: p.slug, art: hasArt(p) }))}
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
                  <span id="more-title">{t.projects.more}</span>
                </Heading>
                <p
                  data-lines
                  className="mt-24 w-760 text-h4 font-semibold text-midnight-100 max-md:w-full"
                >
                  {t.projects.moreIntro}
                </p>

                <FilterList
                  pick="rest"
                  className="mt-80 grid grid-cols-2 gap-x-40 gap-y-96 max-md:mt-48 max-md:grid-cols-1 max-md:gap-y-64"
                  items={projects.map((project) => ({
                    slug: project.slug,
                    art: hasArt(project),
                    node: (
                      <TransitionLink
                        href={`/projects/${project.slug}`}
                        aria-label={t.project.readCaseLabel(project.title)}
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
                              sizes={cardSizes(visualWidth(project, CARD))}
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
                            <ReadMore lang={lang} />
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
