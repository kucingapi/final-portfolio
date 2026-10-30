import Image from "next/image";
import { Chip, Deco, Heading } from "@/components/ui";
import { Marquee } from "@/components/motion/Marquee";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { about, site } from "@/content/site";

/** One run of the name banner: outlined name, diamond, filled name, diamond. */
function NameRun() {
  const name = "font-display text-[calc(var(--s)*64)] leading-[0.9] font-semibold whitespace-nowrap max-md:text-[calc(var(--s)*36)]";
  const diamond = <span aria-hidden className="mx-36 size-18 rotate-45 bg-midnight-50 max-md:mx-20" />;
  return (
    <span className="flex items-center pr-36 max-md:pr-20">
      <span className={`${name} text-transparent [-webkit-text-stroke:calc(var(--s)*2.5)_var(--color-midnight-50)]`}>{site.name}</span>
      {diamond}
      <span className={`${name} text-midnight-50`}>{site.name}</span>
      {diamond}
    </span>
  );
}

/** About (Figma 229:180). */
export function About() {
  return (
    <SectionMotion preset="about">
      <section id="about" aria-labelledby="about-title" data-node-id="229:180" className="relative overflow-clip bg-midnight-900">
        <span data-rule aria-hidden className="absolute inset-x-0 top-0 h-px bg-white" />
        <span data-rule aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-white" />

        <Marquee className="relative z-10 pt-33 max-md:pt-24" duration={28} direction={1}>
          <NameRun />
          <NameRun />
        </Marquee>

        <div className="relative mx-auto h-840 w-1440 max-md:h-auto max-md:w-full max-md:px-20 max-md:py-48">
          <div className="absolute top-[calc(var(--s)*(248-91))] left-106 max-md:static">
            <Heading barTop="0.72em">
              <span id="about-title">About</span>
            </Heading>
          </div>

          <div className="absolute top-[calc(var(--s)*(368-91))] left-38 h-333 w-874 max-md:static max-md:mt-24 max-md:h-auto max-md:w-full">
            <div data-spark className="absolute top-0 left-5 h-56 w-71 max-md:-top-30 max-md:left-auto max-md:right-0 max-md:scale-60">
              <Deco src="/figma/about/sparks-top.svg" width={71} height={56} className="inset-0" />
            </div>
            <p
              data-lines
              className="relative pt-[calc(var(--s)*(425-368))] pl-62 text-justify text-[calc(var(--s)*28)] leading-[1.29] text-midnight-50 max-md:pt-0 max-md:pl-0 max-md:text-lead max-md:leading-[1.45]"
            >
              {about}
            </p>
            <div data-spark className="absolute top-251 left-0 flex h-82 w-71 items-center justify-center max-md:hidden">
              <div className="h-56 w-71 flex-none -rotate-[77.3deg]">
                <Deco src="/figma/about/sparks-bottom.svg" width={71} height={56} className="inset-0" />
              </div>
            </div>
          </div>

          <div className="absolute top-[calc(var(--s)*(286-91))] left-953 h-508 w-387 max-md:relative max-md:inset-auto max-md:mx-auto max-md:mt-48 max-md:h-508">
            <div
              data-portrait
              data-node-id="232:187"
              className="absolute inset-x-0 top-22 bottom-0 overflow-hidden rounded-[calc(var(--s)*43.7)] border-[calc(var(--s)*2.2)] border-base-200 bg-midnight-950"
            >
              <Image
                src="/figma/about/portrait.png"
                alt="Portrait of Novel Bafagih smiling"
                width={520}
                height={520}
                sizes="(max-width: 768px) 90vw, 30vw"
                className="absolute -top-36 left-1/2 size-520 max-w-none -translate-x-1/2"
              />
            </div>
            <Chip data-chip="" className="absolute top-0 left-118 h-48 px-17 text-[calc(var(--s)*19)]">
              {site.name}
            </Chip>
            <Chip data-chip="" tone="teal" className="absolute top-363 left-287">
              Ready to work
            </Chip>
          </div>
        </div>

        <Marquee className="relative z-10 pb-35 max-md:pb-24" duration={32} direction={-1}>
          <NameRun />
          <NameRun />
        </Marquee>
      </section>
    </SectionMotion>
  );
}
