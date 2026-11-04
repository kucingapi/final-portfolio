import { Heading } from "@/components/ui";
import { Marquee } from "@/components/motion/Marquee";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { TransitionLink } from "@/components/transition/PageTransition";
import { getSiteContent } from "@/lib/content/read";

function TalkRow({ outline = false }: { outline?: boolean }) {
  return (
    <span className={`flex ${outline ? "gap-47 pr-47" : "gap-32 pr-32"}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`font-display text-mega font-semibold whitespace-nowrap ${
            outline ? "text-transparent [-webkit-text-stroke:calc(var(--s)*3)_rgb(229_240_255/0.1)]" : "text-midnight-50/10"
          }`}
        >
          Talk
        </span>
      ))}
    </span>
  );
}

/** The closing call to talk, worded per mode, + the Talk wall (Figma 275:3116). */
export async function LetsTalk() {
  const { modes } = await getSiteContent();
  return (
    <SectionMotion preset="talk">
      <section aria-label="Let’s talk" data-node-id="275:3116" className="relative overflow-clip bg-midnight-950">
        <div className="relative mx-auto h-1024 w-1440 max-md:h-auto max-md:w-full max-md:pt-80 max-md:pb-40">
          {(["freelance", "fulltime"] as const).map((m) => (
            <div key={m} data-for={m} className="contents">
              <div className="absolute top-57 left-111 max-md:static max-md:px-20">
                <Heading barLeft="-0.1375em" barRight="-0.06em" className="max-md:text-[calc(var(--s)*28)]">
                  <span>{modes[m].talk.title}</span>
                </Heading>
              </div>
              <p data-lines className="absolute top-205 left-100 w-953 text-h4 font-semibold text-white max-md:static max-md:mt-20 max-md:w-full max-md:px-20">
                {modes[m].talk.body}
              </p>
            </div>
          ))}

          {/* Talk wall: three tilted marquee rows behind the CTA */}
          <div aria-hidden className="absolute -inset-x-40 top-335 -rotate-1 max-md:relative max-md:top-auto max-md:mt-40">
            <div data-talk-row className="relative h-278 max-md:h-115">
              <Marquee duration={36} direction={1}>
                <TalkRow />
              </Marquee>
            </div>
            <div data-talk-row className="relative -mt-100 h-279 max-md:mt-0 max-md:h-115">
              <Marquee duration={28} direction={-1}>
                <TalkRow outline />
              </Marquee>
            </div>
            <div data-talk-row className="relative -mt-103 h-278 max-md:mt-0 max-md:h-115">
              <Marquee duration={40} direction={1}>
                <TalkRow />
              </Marquee>
            </div>
          </div>

          <div className="absolute top-525 left-461 flex h-157 w-482 items-center justify-center max-md:static max-md:mx-auto max-md:-mt-245 max-md:h-auto max-md:w-max">
            <div data-cta className="flex-none -rotate-1">
              <TransitionLink
                href="/contact"
                data-magnetic="18"
                className="flex items-center justify-center rounded-[calc(var(--s)*50)] bg-midnight-500 px-50 py-41 text-h1 font-bold text-white transition-colors hover:bg-midnight-400 max-md:px-32 max-md:py-24"
              >
                <span className="[text-box:trim-both_cap_alphabetic]">Let’s Talk</span>
              </TransitionLink>
            </div>
          </div>
        </div>
      </section>
    </SectionMotion>
  );
}
