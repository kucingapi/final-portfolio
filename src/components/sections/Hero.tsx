import Image from "next/image";
import { InlineSvg } from "@/components/InlineSvg";
import { Chip, Deco } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { ByMode } from "@/components/mode/Mode";
import { modes } from "@/content/site";

/**
 * Hero (Figma 186:1436). Desktop positions are Figma canvas px on the 1440 frame;
 * the photo collage lives in its own box (origin = Figma x 656, y 152) so it can be
 * scaled as one piece on phones.
 */
export function Hero() {
  return (
    <SectionMotion preset="hero">
      <section aria-label="Intro" data-node-id="186:1436" className="relative overflow-clip bg-midnight-950">
        <div className="relative mx-auto h-1024 w-1440 max-md:h-900 max-md:w-full">
          {/* Big looping line, top right (186:1437) */}
          <div aria-hidden data-line className="pointer-events-none absolute -top-165 left-706 flex h-712 w-907 items-center justify-center max-md:-top-120 max-md:left-170 max-md:scale-50 max-md:origin-top-left">
            <div className="h-823 w-381 flex-none rotate-[116.91deg]">
              <div className="relative size-full">
                <InlineSvg src="/figma/hero/loop-top.svg" className="absolute -inset-y-[0.61%] -inset-x-[1.31%]" />
              </div>
            </div>
          </div>

          {/* Bottom-left swoosh (190:2212) */}
          <div aria-hidden data-line className="pointer-events-none absolute top-752 -left-6 h-366 w-664 max-md:top-700 max-md:-left-40 max-md:scale-60 max-md:origin-top-left">
            <InlineSvg src="/figma/hero/swoosh-bottom.svg" className="absolute -inset-y-[1.36%] -inset-x-[0.75%]" />
          </div>

          {(["freelance", "fulltime"] as const).map((m) => {
            const { lead, mark, rest } = modes[m].hero;
            return (
              <h1
                key={m}
                data-for={m}
                data-headline
                data-node-id="188:1989"
                className="absolute top-250 left-100 w-581 text-h1 font-bold text-white [text-box:trim-both_cap_alphabetic] max-md:top-120 max-md:left-20 max-md:w-390"
              >
                <span className="mb-53 block max-md:mb-16">{lead}</span>
                <span className="block">
                  <span className="relative inline-block">
                    {mark}
                    {/* The hand-drawn underline is sized for "Software"; "Freelance" runs a little wider. */}
                    <span
                      aria-hidden
                      data-underline
                      className={`pointer-events-none absolute top-[1.13em] left-[-0.166em] h-[0.25em] ${m === "freelance" ? "w-[4.6em]" : "w-[4.15em]"}`}
                    >
                      <InlineSvg src="/figma/hero/underline.svg" className="absolute -inset-y-[27.12%] -inset-x-[1.46%]" />
                    </span>
                  </span>{" "}
                  {rest}
                </span>
              </h1>
            );
          })}

          {/* Photo collage (186:1942) */}
          <div
            data-collage
            className="absolute top-152 left-656 h-698 w-606 max-md:top-320 max-md:left-30 max-md:origin-top-left max-md:scale-[0.6]"
          >
            <div data-speed="0.9" className="absolute top-43 left-182 h-444 w-354">
              <div data-photo data-node-id="186:1926" className="relative size-full overflow-hidden rounded-lg border-2 border-base-200 bg-midnight-950">
                <Image
                  src="/figma/hero/photo-main.jpg"
                  alt="Novel speaking with a microphone"
                  fill
                  priority
                  sizes="(max-width: 768px) 60vw, 30vw"
                  className="origin-[57%_38%] scale-[1.35] object-cover object-[60%_30%] opacity-80"
                />
              </div>
            </div>
            <Chip data-chip="" className="absolute top-23 left-291">
              Novel Bafagih
            </Chip>

            <div data-speed="1.08" className="absolute top-276 left-25 flex h-404 w-359 items-center justify-center">
              <div data-photo data-node-id="186:1915" className="relative h-333 w-251 flex-none -rotate-[22.5deg] overflow-hidden rounded-lg border-2 border-base-200 bg-base-800">
                <Image
                  src="/figma/hero/photo-left.jpg"
                  alt="Novel Bafagih at an event"
                  fill
                  sizes="(max-width: 768px) 40vw, 20vw"
                  className="object-cover object-[50%_30%] opacity-60"
                />
              </div>
            </div>
            <div data-chip className="absolute top-596 left-118 flex h-65 w-83 items-center justify-center">
              <Chip tone="teal" className="flex-none -rotate-[22.5deg]">Open</Chip>
            </div>

            <div data-speed="1.15" className="absolute top-294 left-325 flex h-404 w-359 items-center justify-center">
              <div data-photo data-node-id="186:1921" className="relative h-333 w-251 flex-none rotate-[22.5deg] overflow-hidden rounded-lg border-2 border-base-200 bg-base-800">
                <Image
                  src="/figma/hero/photo-right.jpg"
                  alt="Novel smiling"
                  fill
                  sizes="(max-width: 768px) 40vw, 20vw"
                  className="object-cover object-[48%_50%] opacity-60"
                />
              </div>
            </div>
            <div data-chip className="absolute top-616 left-506 flex h-73 w-101 items-center justify-center">
              <Chip tone="olive" className="flex-none rotate-[22.5deg]">
                <ByMode freelance={modes.freelance.chip} fulltime={modes.fulltime.chip} />
              </Chip>
            </div>

            {/* Doodles around the collage */}
            <div data-spark className="absolute top-1 left-136 h-57 w-41">
              <Deco src="/figma/hero/spark-21.svg" width={51} height={67} className="inset-0" bleed="-8.72% -12.07%" />
            </div>
            <div data-spark className="absolute top-12 left-149 h-81 w-63">
              <Deco src="/figma/hero/spark-20.svg" width={73} height={91} className="inset-0" bleed="-6.18% -7.98%" />
            </div>
            <div data-spark-draw className="absolute top-193 left-85 h-61 w-94" aria-hidden>
              <InlineSvg src="/figma/hero/arrow.svg" className="absolute -inset-y-[8.22%] -inset-x-[5.3%]" />
            </div>
            <div data-spark className="absolute top-190 left-162 h-68 w-21">
              <Deco src="/figma/hero/tick-vertical.svg" width={31} height={78} className="inset-0" bleed="-7.36% -23.31% -7.36% -23.3%" />
            </div>
            <div data-spark className="absolute top-255 left-80 h-1 w-106">
              <Deco src="/figma/hero/tick-horizontal.svg" width={116} height={11} className="inset-0" bleed="-419.41% -4.71%" />
            </div>
            <div data-spark className="absolute top-338 left-1 h-100 w-36">
              <Deco src="/figma/hero/spark-18.svg" width={46} height={110} className="inset-0" bleed="-5.02% -13.82% -5.02% -13.81%" />
            </div>
            <div data-spark className="absolute top-692 left-516 h-27 w-95">
              <Deco src="/figma/hero/spark-19.svg" width={105} height={37} className="inset-0" bleed="-18.39% -5.25%" />
            </div>
          </div>

          {/* White starburst rising at the bottom edge (188:1988) */}
          <div data-burst className="absolute top-897 left-594 h-254 w-253 max-md:top-773 max-md:left-89">
            <Deco src="/figma/hero/starburst.svg" width={253} height={254} className="inset-0" />
          </div>

          {/* Striped circle straddling the boundary into Projects (190:2264) */}
          <div className="absolute top-948 left-1365 h-152 w-149 max-md:hidden">
            <Deco src="/figma/hero/striped-circle.svg" width={150} height={153} className="inset-0" bleed="-0.33% -0.34% -0.11% -0.34%" />
          </div>
        </div>
      </section>
    </SectionMotion>
  );
}
