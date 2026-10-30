import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Deco, Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { projects, type Project } from "@/content/site";

type Layer = { src: string; w: number; h: number; className: string };

/**
 * Each card is drawn at its Figma size (`w`×`h`) and scaled as a whole on phones
 * (`mobileScale`), so the mockup crops stay exactly as designed.
 */
const CARDS: {
  node: string;
  w: number;
  h: number;
  pos: string;
  radius: string;
  mobile: string;
  speed: string;
  layers: [Layer, Layer];
}[] = [
  {
    node: "199:3108",
    w: 813,
    h: 480,
    pos: "top-306 left-100",
    radius: "rounded-br-lg",
    mobile: "max-md:h-230 max-md:[--k:0.48]",
    speed: "0.95",
    layers: [
      { src: "/figma/projects/image3.png", w: 812, h: 607, className: "-bottom-43 left-[calc(50%+0.32*var(--s))] h-607 w-812 -translate-x-1/2" },
      { src: "/figma/projects/image6.png", w: 812, h: 609, className: "-top-85 left-1 h-609 w-812" },
    ],
  },
  {
    node: "199:3100",
    w: 390,
    h: 480,
    pos: "top-306 left-950",
    radius: "rounded-bl-lg",
    mobile: "max-md:h-480 max-md:[--k:1]",
    speed: "1.05",
    layers: [
      { src: "/figma/projects/macbook01.png", w: 642, h: 481, className: "-top-1 -left-126 h-481 w-642" },
      { src: "/figma/projects/image14.png", w: 642, h: 481, className: "-top-1 -left-126 h-481 w-642" },
    ],
  },
  {
    node: "199:3096",
    w: 390,
    h: 742,
    pos: "top-813 left-101",
    radius: "rounded-tr-lg",
    mobile: "max-md:h-742 max-md:[--k:1]",
    speed: "1.05",
    layers: [
      { src: "/figma/projects/image10.png", w: 638, h: 742, className: "top-0 -left-124 h-742 w-638" },
      { src: "/figma/projects/image15.png", w: 990, h: 742, className: "top-0 -left-300 h-742 w-990" },
    ],
  },
  {
    node: "199:3104",
    w: 813,
    h: 741,
    pos: "top-813 left-523",
    radius: "rounded-tl-lg",
    mobile: "max-md:h-355 max-md:[--k:0.48]",
    speed: "0.95",
    layers: [
      { src: "/figma/projects/image7.png", w: 988, h: 740, className: "top-0 -left-87 h-740 w-988" },
      { src: "/figma/projects/image9.png", w: 988, h: 742, className: "top-0 -left-87 h-742 w-988" },
    ],
  },
];

function CardShell({ project, children, className }: { project: Project; children: ReactNode; className: string }) {
  if (project.href) {
    return (
      <Link href={project.href} aria-label={project.title} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <div role="img" aria-label={project.title} className={className}>
      {children}
    </div>
  );
}

export function Projects() {
  return (
    <SectionMotion preset="projects">
      <section id="projects" aria-labelledby="projects-title" data-node-id="193:2317" className="relative overflow-clip bg-midnight-900">
        <div className="relative mx-auto h-1641 w-1440 max-md:h-auto max-md:w-full max-md:px-20 max-md:pt-110 max-md:pb-60">
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
          <p data-lines className="absolute top-143 left-100 w-707 text-h4 font-semibold text-midnight-100 max-md:static max-md:mt-12 max-md:w-full">
            All of the selected works ranging from website and websites
          </p>

          <div data-grid className="max-md:mt-32 max-md:flex max-md:flex-col max-md:gap-16">
            {CARDS.map((card, i) => {
              const project = projects[i];
              return (
                <div
                  key={card.node}
                  data-card
                  data-node-id={card.node}
                  className={`absolute h-[calc(var(--s)*var(--h))] w-[calc(var(--s)*var(--w))] ${card.pos} max-md:relative max-md:inset-auto max-md:w-full ${card.mobile}`}
                  style={{ "--w": card.w, "--h": card.h } as CSSProperties}
                >
                  <CardShell
                    project={project}
                    className={`group absolute inset-0 block overflow-hidden bg-midnight-950 ${card.radius} max-md:rounded-lg max-md:w-full`}
                  >
                    <div className="absolute top-0 left-0 h-[calc(var(--s)*var(--h))] w-[calc(var(--s)*var(--w))] origin-top-left max-md:scale-(--k)">
                      <Image
                        src={card.layers[0].src}
                        alt=""
                        width={card.layers[0].w}
                        height={card.layers[0].h}
                        sizes="(max-width: 768px) 100vw, 60vw"
                        className={`absolute max-w-none object-cover ${card.layers[0].className}`}
                      />
                      <div data-speed={card.speed} className="absolute inset-0">
                        <Image
                          src={card.layers[1].src}
                          alt=""
                          width={card.layers[1].w}
                          height={card.layers[1].h}
                          sizes="(max-width: 768px) 100vw, 60vw"
                          className={`absolute max-w-none object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04] ${card.layers[1].className}`}
                        />
                      </div>
                    </div>
                    <span className="pointer-events-none absolute bottom-24 left-24 translate-y-8 rounded-full bg-white px-20 py-8 font-inter text-chip font-bold text-base-900 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      {project.title}
                    </span>
                  </CardShell>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </SectionMotion>
  );
}
