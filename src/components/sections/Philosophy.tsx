import { Chip, Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { philosophy } from "@/content/site";
import * as wide from "@/components/philosophy/brain-pattern";
import * as tall from "@/components/philosophy/brain-pattern-mobile";

/**
 * The brain-fold wallpaper. Phones get their own taller pattern, so the folds keep the same size
 * on screen instead of being blown up to fill the height. Blank until the motion preset draws it.
 */
type PatternArt = { PATTERN_VIEWBOX: { w: number; h: number }; PATTERN_STROKE: number; brainPattern: string[] };

function Pattern({ art, className }: { art: PatternArt; className: string }) {
  const { w, h } = art.PATTERN_VIEWBOX;
  return (
    <svg data-pattern aria-hidden viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice" className={`absolute inset-0 size-full ${className}`}>
      <g fill="none" stroke="var(--color-midnight-800)" strokeWidth={art.PATTERN_STROKE} strokeLinecap="round" strokeLinejoin="round" opacity={0.38}>
        {art.brainPattern.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** "How I work": the working philosophy, over a brain pattern that grows as the section scrolls by. */
export function Philosophy() {
  return (
    <SectionMotion preset="philosophy">
      <section id="philosophy" aria-labelledby="philosophy-title" className="relative overflow-clip bg-midnight-950">
        <Pattern art={wide} className="max-md:hidden" />
        <Pattern art={tall} className="md:hidden" />

        <div className="relative mx-auto w-1240 py-180 max-md:w-full max-md:px-20 max-md:py-96">
          <Heading barTop="0.875em">
            <span id="philosophy-title">{philosophy.title}</span>
          </Heading>
          <p data-lines className="mt-32 w-980 text-h4 font-semibold text-midnight-50 max-md:mt-20 max-md:w-full">
            {philosophy.lede}
          </p>
          <ul aria-label="What I cover" className="mt-36 flex flex-wrap gap-10 max-md:mt-24">
            {philosophy.span.map((item) => (
              <li key={item} data-span>
                <Chip>{item}</Chip>
              </li>
            ))}
          </ul>

          <ol className="mt-120 flex flex-col max-md:mt-64">
            {philosophy.steps.map((step, i) => (
              <li
                key={step.title}
                data-step
                className="grid grid-cols-[calc(var(--s)*140)_calc(var(--s)*500)_1fr] items-baseline gap-x-40 border-t-2 border-midnight-50/20 py-44 max-md:grid-cols-[calc(var(--s)*52)_1fr] max-md:gap-x-12 max-md:py-28"
              >
                <span className="font-display text-h3 leading-none font-semibold text-midnight-400 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-h4 font-semibold text-midnight-50">{step.title}</h3>
                <p className="text-lead leading-[1.5] text-midnight-100 max-md:col-start-2 max-md:mt-12">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-120 border-t-2 border-midnight-50/20 pt-80 max-md:mt-64 max-md:pt-48">
            <p className="text-h2 font-bold text-midnight-50">
              {philosophy.pledge.lead}{" "}
              <span className="relative inline-block">
                <span data-pledge-bar aria-hidden className="highlight-bar absolute top-[0.62em] -right-[0.16em] -left-[0.1em] h-[0.5em]" />
                <span className="relative">{philosophy.pledge.mark}</span>
              </span>
            </p>
            <p data-lines className="mt-24 text-h4 font-semibold text-midnight-100 max-md:mt-16">
              {philosophy.pledgeNote}
            </p>
          </div>
        </div>
      </section>
    </SectionMotion>
  );
}
