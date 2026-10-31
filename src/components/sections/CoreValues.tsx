import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { Heading } from "@/components/ui";
import { InlineSvg } from "@/components/InlineSvg";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { coreValues } from "@/content/site";

type Key = (typeof coreValues)[number]["key"];

const px = (n: number) => `calc(var(--s) * ${n})`;

/** A Figma vector at panel-local coordinates (x, y, w, h in design px). */
function V({
  src,
  x,
  y,
  w,
  h,
  className = "",
  ...rest
}: {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  className?: string;
  [data: `data-${string}`]: string | undefined;
}) {
  return (
    <div aria-hidden className="absolute" style={{ left: px(x), top: px(y), width: px(w), height: px(h) }} {...rest}>
      <Image src={src} alt="" width={Math.ceil(w)} height={Math.ceil(h)} unoptimized className={`block size-full max-w-none ${className}`} />
    </div>
  );
}

/** A solid block at panel-local coordinates. */
function B({ x, y, w, h, className, ...rest }: { x: number; y: number; w: number; h: number; className: string; [data: `data-${string}`]: string | undefined }) {
  return <div aria-hidden className={`absolute ${className}`} style={{ left: px(x), top: px(y), width: px(w), height: px(h) }} {...rest} />;
}

/* Illustrations. Coordinates are local to each Figma illustration panel (450:663, 450:678, …). */

function Fast() {
  return (
    <>
      <V src="/figma/values/ellipse2.svg" x={97.5} y={49.5} w={147} h={147} />
      {[130.47, 148.47, 167.47, 185.47].map((x, i) => (
        <div key={x} data-chevron className="contents">
          <V src="/figma/values/vector32.svg" x={x} y={41.47} w={68.5} h={62} />
          {i === 0 && <V src="/figma/values/vector37.svg" x={x} y={103.47} w={87.5} h={81} className="-scale-y-100" />}
          {i === 1 && <V src="/figma/values/vector36.svg" x={x} y={103.47} w={80.5} h={74} className="-scale-y-100" />}
          {i > 1 && <V src="/figma/values/vector32.svg" x={x} y={103.47} w={68.5} h={62} className="-scale-y-100" />}
        </div>
      ))}
    </>
  );
}

function Reliable() {
  const block = "bg-midnight-950";
  return (
    <>
      <B data-block="" x={76.47} y={17.47} w={72} h={134} className={`${block} rounded-tl-[calc(var(--s)*28)]`} />
      <B data-block="" x={187.47} y={17.47} w={72} h={134} className={`${block} rounded-tr-[calc(var(--s)*28)]`} />
      <B data-block="" x={86.47} y={158.47} w={72} h={72} className={`${block} rounded-bl-[calc(var(--s)*28)]`} />
      <B data-block="" x={177.47} y={158.47} w={72} h={72} className={`${block} rounded-br-[calc(var(--s)*28)]`} />
      {[
        { w: 64, y: 40.47 },
        { w: 100, y: 65.47 },
        { w: 136, y: 95.47 },
        { w: 100, y: 125.47 },
      ].map((bar) => (
        <B key={bar.y} data-bar="" x={170.5 - bar.w / 2} y={bar.y} w={bar.w} h={16} className="bg-midnight-800" />
      ))}
    </>
  );
}

function Flexible() {
  return (
    <>
      <div data-wave className="absolute" style={{ left: px(-15.53), top: px(95.47), width: px(382), height: px(55) }}>
        <InlineSvg src="/figma/values/vector40.svg" className="absolute -inset-y-[40.91%] -inset-x-[3.96%]" />
      </div>
      <div data-wave className="absolute" style={{ left: px(3.47), top: px(120.47), width: px(350), height: px(56) }}>
        <InlineSvg src="/figma/values/vector41.svg" className="absolute -inset-y-[40.18%] -inset-x-[4.57%]" />
      </div>
    </>
  );
}

function AiAssisted() {
  return (
    <>
      <V data-swoop="" src="/figma/values/subtract.svg" x={511.47} y={110.47} w={194} h={187} className="-scale-x-100" />
      <div data-arrow className="absolute flex items-center justify-center" style={{ left: px(248.4), top: px(-14.03), width: px(252), height: px(218.5) }}>
        <div className="relative flex-none rotate-90" style={{ width: px(218.5), height: px(252) }}>
          <div className="absolute" style={{ inset: "-6.31% -14.56% -6.31% 0" }}>
            <Image src="/figma/values/vector42.svg" alt="" width={251} height={284} unoptimized className="block size-full max-w-none" />
          </div>
        </div>
      </div>
      <V data-swoop="" src="/figma/values/subtract1.svg" x={25.56} y={51.85} w={194} h={187} />
      {[
        { x: 361.47, y: 60.47, w: 102 },
        { x: 374.47, y: 78.47, w: 173 },
        { x: 374.47, y: 96.47, w: 181 },
        { x: 382.47, y: 114.47, w: 143 },
      ].map((b) => (
        <B key={b.y} data-bar="" x={b.x} y={b.y} w={b.w} h={12} className="bg-midnight-800" />
      ))}
    </>
  );
}

function ProblemSolver() {
  return (
    <>
      <V data-piece="" src="/figma/values/subtract2.svg" x={87.47} y={70.47} w={129} h={129} />
      <div data-piece className="absolute" style={{ left: px(122.5), top: px(40.47), width: px(129), height: px(129) }}>
        <div className="absolute top-0 right-0 bottom-1/2 left-1/2">
          <Image src="/figma/values/ellipse4.svg" alt="" width={65} height={65} unoptimized className="block size-full max-w-none" />
        </div>
        <B x={41} y={28} w={20.5} h={13} className="bg-midnight-950" />
        <B x={86.97} y={64.5} w={13} h={20.5} className="bg-midnight-950" />
      </div>
    </>
  );
}

const ART: Record<Key, () => ReactNode> = {
  fast: Fast,
  reliable: Reliable,
  flexible: Flexible,
  aiAssisted: AiAssisted,
  problemSolver: ProblemSolver,
};

/** Card geometry from Figma (450:662 … 450:723). Panel = illustration area. */
const LAYOUT: Record<Key, { w: number; h: number; radius: string; panelW: number; panelH: number; textTop: number; bodyW: number }> = {
  fast: { w: 383, h: 443, radius: "rounded-xl", panelW: 341.5, panelH: 246.8, textTop: 283.47, bodyW: 349 },
  reliable: { w: 383, h: 443, radius: "rounded-xl", panelW: 341.5, panelH: 246.8, textTop: 283.47, bodyW: 324 },
  flexible: { w: 385, h: 443, radius: "rounded-xl", panelW: 343.5, panelH: 246.8, textTop: 283.47, bodyW: 329 },
  aiAssisted: { w: 811, h: 443, radius: "rounded-lg", panelW: 770.2, panelH: 274.5, textTop: 311.15, bodyW: 465 },
  problemSolver: { w: 383, h: 443, radius: "rounded-lg", panelW: 341.5, panelH: 246.8, textTop: 283.47, bodyW: 347 },
};

function ValueCard({ value }: { value: (typeof coreValues)[number] }) {
  const l = LAYOUT[value.key];
  const Art = ART[value.key];
  const wide = value.key === "aiAssisted";
  return (
    <article
      data-card={value.key}
      className={`group relative h-[calc(var(--s)*var(--h))] w-[calc(var(--s)*var(--w))] shrink-0 overflow-hidden border-[calc(var(--s)*3)] border-midnight-50 bg-midnight-950 transition-[translate] duration-500 ease-[var(--ease-out)] hover:-translate-y-8 ${l.radius} max-md:h-auto max-md:w-full max-md:pb-24`}
      style={{ "--w": l.w, "--h": l.h, "--pw": l.panelW, "--ph": l.panelH, "--tt": l.textTop, "--bw": l.bodyW } as CSSProperties}
    >
      <div
        className={`absolute top-[calc(var(--s)*20.5)] left-[calc(var(--s)*20.5)] h-[calc(var(--s)*var(--ph))] w-[calc(var(--s)*var(--pw))] overflow-hidden rounded-md bg-midnight-800 max-md:relative max-md:inset-auto max-md:mx-auto max-md:mt-20 ${wide ? "max-md:h-[calc(var(--s)*124)] max-md:w-[calc(var(--s)*349)]" : ""}`}
      >
        <div
          className={`absolute top-0 left-0 h-[calc(var(--s)*var(--ph))] w-[calc(var(--s)*var(--pw))] origin-top-left transition-transform duration-500 group-hover:scale-[1.03] ${wide ? "max-md:scale-[0.453] max-md:group-hover:scale-[0.47]" : ""}`}
        >
          <Art />
        </div>
      </div>
      <div className="absolute top-[calc(var(--s)*var(--tt))] left-[calc(var(--s)*21)] flex flex-col gap-11 max-md:static max-md:mt-20 max-md:px-20">
        <h3 className="text-h4 font-semibold text-midnight-50">{value.title}</h3>
        <p className="w-[calc(var(--s)*var(--bw))] text-lead font-semibold text-justify text-midnight-50 max-md:w-full max-md:text-left">
          {value.body}
        </p>
      </div>
    </article>
  );
}

/** Core Values (Figma 275:3118). */
export function CoreValues() {
  const [fast, reliable, flexible, aiAssisted, problemSolver] = coreValues;
  return (
    <SectionMotion preset="values">
      <section aria-labelledby="values-title" data-node-id="275:3118" className="relative overflow-clip bg-midnight-900">
        <div className="relative mx-auto h-1107 w-1440 max-md:h-auto max-md:w-full max-md:px-20 max-md:py-64">
          <div className="absolute top-0 left-122 max-md:static">
            <Heading barTop="0.69em" barLeft="-0.16em" barRight="-0.25em">
              <span id="values-title">Core Values</span>
            </Heading>
          </div>
          <div data-grid className="absolute top-131 left-101 flex w-1240 flex-col gap-22 max-md:static max-md:mt-32 max-md:w-full max-md:gap-16">
            <div className="flex gap-44 max-md:flex-col max-md:gap-16">
              <ValueCard value={fast} />
              <ValueCard value={reliable} />
              <ValueCard value={flexible} />
            </div>
            <div className="flex gap-46 max-md:flex-col max-md:gap-16">
              <ValueCard value={aiAssisted} />
              <ValueCard value={problemSolver} />
            </div>
          </div>
        </div>
      </section>
    </SectionMotion>
  );
}
