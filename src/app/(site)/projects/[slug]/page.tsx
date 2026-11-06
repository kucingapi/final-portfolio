import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Fragment } from "react";
import { Picture } from "@/components/Picture";
import { Chip, Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { TransitionLink } from "@/components/transition/PageTransition";
import { ProjectVisual, visualWidth } from "@/components/projects/ProjectVisual";
import { LetsTalk } from "@/components/sections/LetsTalk";
import { Footer } from "@/components/sections/Footer";
import { nextProject, type Chapter, type Part } from "@/content/projects";
import { getProject, getProjects } from "@/lib/content/read";

/*
 * Every slug is prerendered, and the page transition covers the screen until the route is ready,
 * so there is nothing to stream behind <Suspense>: opt out of instant-navigation validation.
 */
export const instant = false;

export async function generateStaticParams() {
  return (await getProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/projects/[slug]">): Promise<Metadata> {
  const project = await getProject((await params).slug);
  if (!project) return {};
  return { title: project.title, description: project.summary };
}

const HERO = { w: 1240, h: 700 };

/**
 * Sizes for a render drawn `w` design px wide in the 1240 frame (scaled to 390 on phones). The design
 * stops growing at 1440, so from there it is `w` px.
 */
const heroSizes = (w: number) =>
  `(max-width: 1023px) ${Math.round((w / 1240) * 91)}vw, (min-width: 1440px) ${w}px, ${Math.round(w / 14.4)}vw`;

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Figure({ figure }: { figure: NonNullable<Chapter["figure"]> }) {
  return (
    <div data-rise className="flex flex-col gap-8">
      <p className="flex items-center gap-20 font-display text-h3 leading-none font-semibold text-midnight-50 tabular-nums max-md:gap-12">
        {figure.from && (
          <>
            <span className="text-midnight-200">{figure.from}</span>
            <Arrow className="size-48 shrink-0 text-midnight-400 max-md:size-28" />
          </>
        )}
        <span>{figure.to}</span>
      </p>
      <p className="text-lead text-midnight-100">{figure.label}</p>
    </div>
  );
}

function Bars({ bars }: { bars: NonNullable<Chapter["bars"]> }) {
  return (
    <div data-rise className="flex flex-col gap-32">
      {bars.map((bar) => (
        <div key={bar.label} className="flex flex-col gap-10">
          <div className="flex items-baseline justify-between gap-16">
            <span className="text-h4 font-semibold text-midnight-50">{bar.label}</span>
            <span className="font-display text-h3 leading-none font-semibold text-midnight-50 tabular-nums">{bar.value}%</span>
          </div>
          <div className="h-24 overflow-hidden rounded-full bg-midnight-950">
            <div data-bar className="h-full rounded-full bg-midnight-400" style={{ width: `${Math.max(bar.value, 2)}%` }} />
          </div>
          <span className="text-body text-midnight-100">{bar.note}</span>
        </div>
      ))}
    </div>
  );
}

function PartHeader({ part, n }: { part: Part; n: number }) {
  return (
    <header data-part aria-labelledby={`part-${n}-title`} className="flex items-start gap-56 not-first:mt-80 max-md:flex-col max-md:gap-16 max-md:not-first:mt-32">
      <p data-rise aria-hidden className="w-250 shrink-0 font-display text-mega leading-[0.8] font-semibold text-midnight-400 tabular-nums max-md:w-auto">
        {String(n).padStart(2, "0")}
      </p>
      <div className="flex flex-col items-start gap-24 max-md:gap-16">
        <div data-rise className="flex flex-wrap items-center gap-x-24 gap-y-12">
          <Heading size="text-h3" barTop="0.64em" barHeight="0.6em" barLeft="-0.1em" barRight="-0.16em">
            <span id={`part-${n}-title`}>{part.title}</span>
          </Heading>
          <Chip>{part.period}</Chip>
        </div>
        <p data-rise className="w-760 text-h4 font-semibold text-midnight-100 max-md:w-full">
          {part.lede}
        </p>
      </div>
    </header>
  );
}

function ChapterBlock({ chapter, flip, level }: { chapter: Chapter; flip: boolean; level: "h2" | "h3" }) {
  const side = chapter.shot ?? chapter.figure ?? chapter.bars;
  // A chapter with nothing beside it stays left-aligned instead of alternating.
  flip = flip && Boolean(side);
  return (
    <article data-chapter aria-labelledby={`${chapter.id}-title`} className="flex flex-col gap-40 max-md:gap-24">
      <Heading as={level} size="text-h4" barTop="0.62em" barHeight="0.5em" barLeft="-0.1em" barRight="-0.2em">
        <span id={`${chapter.id}-title`}>{chapter.title}</span>
      </Heading>
      <div className={`flex gap-80 max-md:flex-col max-md:gap-32 ${flip ? "flex-row-reverse" : ""}`}>
        <div className={`flex flex-col gap-24 text-lead leading-[1.45] text-midnight-100 ${side ? "w-520 shrink-0" : "w-760"} max-md:w-full`}>
          <p data-rise>
            <strong className="font-semibold text-midnight-50">The problem. </strong>
            {chapter.problem}
          </p>
          <div data-rise>
            <strong className="font-semibold text-midnight-50">What I did.</strong>
            <ul className="mt-12 flex flex-col gap-10">
              {chapter.did.map((item) => (
                <li key={item} className="flex gap-14">
                  <span aria-hidden className="mt-[0.5em] size-10 shrink-0 rounded-full border-2 border-midnight-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <p data-rise>
            <strong className="font-semibold text-midnight-50">What changed. </strong>
            {chapter.result}
          </p>
          {chapter.shot && chapter.figure && (
            <div className="mt-8">
              <Figure figure={chapter.figure} />
            </div>
          )}
        </div>

        {chapter.shot ? (
          <figure data-rise className="flex min-w-0 flex-1 flex-col gap-14">
            <div className={`overflow-hidden border-2 border-midnight-50 bg-white ${flip ? "rounded-tl-lg rounded-br-xs" : "rounded-tr-lg rounded-bl-xs"}`}>
              <Picture
                src={chapter.shot.src}
                alt={chapter.shot.alt}
                width={chapter.shot.width}
                height={chapter.shot.height}
                sizes="(max-width: 1023px) 100vw, 50vw"
                className="block h-auto w-full"
              />
            </div>
            {chapter.shot.caption && <figcaption className="text-body text-midnight-200">{chapter.shot.caption}</figcaption>}
          </figure>
        ) : chapter.bars ? (
          <div className="flex-1 self-center max-md:w-full max-md:self-stretch">
            <Bars bars={chapter.bars} />
          </div>
        ) : chapter.figure ? (
          <div className="flex flex-1 items-center">
            <Figure figure={chapter.figure} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
  const project = await getProject((await params).slug);
  if (!project) notFound();
  const next = nextProject(await getProjects(), project.slug);

  return (
    <>
      <SectionMotion preset="case">
        <main>
          <section aria-labelledby="project-title" className="relative overflow-clip bg-midnight-950">
            <div className="relative mx-auto w-1240 pt-150 pb-120 max-md:w-full max-md:px-20 max-md:pt-110 max-md:pb-64">
              <TransitionLink
                href="/projects"
                data-subline
                // The padding is taken back by the margin: same look, a tap target a finger can hit.
                className="-my-12 inline-flex items-center gap-10 py-12 text-lead font-semibold text-midnight-100 transition-colors hover:text-midnight-50"
              >
                <Arrow className="size-24 rotate-180" />
                All projects
              </TransitionLink>

              <h1 id="project-title" data-headline className="mt-32 text-h1 font-bold text-midnight-50 [text-box:trim-both_cap_alphabetic] max-md:mt-24">
                {project.title}
              </h1>
              {project.fullName && (
                <p data-subline className="mt-24 text-h4 font-semibold text-midnight-100">
                  {project.fullName}
                </p>
              )}

              <div className="mt-36 flex items-start justify-between gap-80 max-md:mt-32 max-md:flex-col max-md:gap-32">
                <p data-subline className="w-700 text-h4 font-semibold text-midnight-50 max-md:w-full">
                  {project.summary}
                </p>
                <dl data-subline className="grid w-400 grid-cols-[auto_1fr] gap-x-24 gap-y-12 text-lead max-md:w-full">
                  <dt className="text-midnight-200">Client</dt>
                  <dd className="font-semibold text-midnight-50">{project.client}</dd>
                  <dt className="text-midnight-200">Role</dt>
                  <dd className="font-semibold text-midnight-50">{project.role}</dd>
                  <dt className="text-midnight-200">When</dt>
                  <dd className="font-semibold text-midnight-50">{project.period}</dd>
                  {project.status && (
                    <>
                      <dt className="text-midnight-200">Status</dt>
                      <dd className="font-semibold text-midnight-50">{project.status.note}</dd>
                    </>
                  )}
                </dl>
              </div>

              <div
                data-hero-art
                className="relative mt-48 h-[calc(var(--s)*700)] overflow-hidden rounded-tr-lg bg-midnight-950 max-md:mt-40 max-md:h-[calc(var(--s)*220)] max-md:rounded-tr-md"
              >
                <div className="absolute top-0 left-0 h-[calc(var(--s)*700)] w-[calc(var(--s)*1240)] origin-top-left max-md:scale-[calc(390/1240)]">
                  <ProjectVisual project={project} frame={HERO} sizes={heroSizes(visualWidth(project, HERO))} preload />
                </div>
                <span className="sr-only">{project.art?.alt ?? project.cover?.alt ?? `${project.stat.value} ${project.stat.label}`}</span>
              </div>

              <div className="mt-32 flex flex-wrap items-center justify-between gap-24 max-md:mt-24">
                <ul aria-label="Stack" className="flex flex-wrap gap-10">
                  {project.stack.map((item) => (
                    <li key={item} data-pop>
                      <Chip>{item}</Chip>
                    </li>
                  ))}
                </ul>
                {project.links?.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    data-pop
                    data-magnetic="8"
                    className="inline-flex items-center gap-12 rounded-full border-2 border-midnight-50 px-28 py-10 text-lead font-semibold text-midnight-50 transition-colors hover:bg-midnight-50 hover:text-midnight-950"
                  >
                    {link.label}
                    <Arrow className="size-22 -rotate-45" />
                  </a>
                ))}
              </div>
            </div>
          </section>

          <section aria-label="Overview" className="relative">
            <div aria-hidden className="absolute inset-x-0 top-0 h-201 rounded-tr-[calc(var(--s)*1000)] bg-midnight-900 max-md:h-120" />
            <div aria-hidden className="absolute inset-x-0 top-200 -bottom-1 bg-midnight-900 max-md:top-119" />
            <div className="relative mx-auto grid w-1240 grid-cols-2 gap-80 pt-110 pb-120 max-md:w-full max-md:grid-cols-1 max-md:gap-56 max-md:px-20 max-md:pt-64 max-md:pb-72">
              {[
                { title: "What it is", body: project.intro },
                { title: "My part", body: project.part },
              ].map((col) => (
                <div key={col.title} className="flex flex-col gap-32 max-md:gap-20">
                  <Heading as="h2" size="text-h3" barTop="0.64em" barHeight="0.6em" barLeft="-0.1em" barRight="-0.16em">
                    {col.title}
                  </Heading>
                  {col.body.map((p) => (
                    <p key={p} data-lines className="text-lead leading-[1.5] text-midnight-100">
                      {p}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section aria-label="Case study" className="relative bg-midnight-900">
            <div className="relative mx-auto flex w-1240 flex-col gap-160 pb-160 max-md:w-full max-md:gap-96 max-md:px-20 max-md:pb-96">
              {project.chapters.map((chapter, i) => {
                const p = project.parts?.findIndex((part) => part.from === chapter.id) ?? -1;
                return (
                  <Fragment key={chapter.id}>
                    {p >= 0 && <PartHeader part={project.parts![p]} n={p + 1} />}
                    <ChapterBlock chapter={chapter} flip={i % 2 === 1} level={project.parts ? "h3" : "h2"} />
                  </Fragment>
                );
              })}
            </div>
          </section>

          {project.method && (
            <section aria-labelledby="method-title" className="relative bg-midnight-950">
              <div className="relative mx-auto flex w-1240 items-start gap-80 py-120 max-md:w-full max-md:flex-col max-md:gap-24 max-md:px-20 max-md:py-80">
                <Heading size="text-h3" barTop="0.64em" barHeight="0.6em" barLeft="-0.1em" barRight="-0.16em" className="shrink-0">
                  <span id="method-title">How I worked</span>
                </Heading>
                <p data-lines className="text-h4 font-semibold text-midnight-100">
                  {project.method}
                </p>
              </div>
            </section>
          )}

          <section aria-labelledby="next-title" className="relative bg-midnight-900">
            <div className="relative mx-auto w-1240 py-120 max-md:w-full max-md:px-20 max-md:py-80">
              <Heading size="text-h3" barTop="0.64em" barHeight="0.6em" barLeft="-0.1em" barRight="-0.16em">
                <span id="next-title">Next project</span>
              </Heading>
              <div data-next className="relative mt-40 h-[calc(var(--s)*700)] max-md:mt-24 max-md:h-[calc(var(--s)*220)]">
                <TransitionLink
                  href={`/projects/${next.slug}`}
                  aria-label={`Next project: ${next.title}`}
                  className="group absolute inset-0 block overflow-hidden rounded-tl-lg bg-midnight-950 max-md:rounded-tl-md"
                >
                  <div className="absolute top-0 left-0 h-[calc(var(--s)*700)] w-[calc(var(--s)*1240)] origin-top-left max-md:scale-[calc(390/1240)]">
                    <ProjectVisual project={next} frame={HERO} sizes={heroSizes(visualWidth(next, HERO))} />
                  </div>
                  <span className="pointer-events-none absolute bottom-32 left-32 flex flex-wrap items-center gap-8 max-md:bottom-12 max-md:left-12">
                    <Chip>{next.title}</Chip>
                    <span className="inline-flex h-40 items-center rounded-full border-2 border-midnight-50/70 bg-midnight-950/70 px-16 font-inter text-chip font-medium tracking-[-0.01em] whitespace-nowrap text-midnight-50 backdrop-blur-sm max-md:hidden">
                      {next.tag}
                    </span>
                  </span>
                </TransitionLink>
              </div>
            </div>
          </section>
        </main>
      </SectionMotion>
      <LetsTalk />
      <Footer />
    </>
  );
}
