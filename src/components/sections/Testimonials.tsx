import { Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { getSiteContent } from "@/lib/content/read";
import { getLang } from "@/lib/i18n/server";
import { ui } from "@/lib/i18n/ui";
import { MODES, type Mode } from "@/lib/modes";
import { TestimonialDeck } from "./TestimonialDeck";

/**
 * Testimonials (Figma 249:2682): heading on the left, the fanned card deck on the right. Each one shows
 * in one mode or every mode. Modes with the same list share a deck (`data-for` lists them, like the
 * rest of the mode copy); a mode with none shows no section.
 */
export async function Testimonials() {
  const lang = await getLang();
  const t = ui(lang).home.testimonials;
  const { testimonials } = await getSiteContent(lang);
  const shownIn = (m: Mode) => testimonials.filter((t) => !t.mode || t.mode === "both" || t.mode === m);
  // Group the modes whose lists are identical into one deck.
  const decks: { modes: Mode[]; list: typeof testimonials }[] = [];
  for (const m of MODES) {
    const list = shownIn(m);
    if (!list.length) continue;
    const deck = decks.find((d) => d.list.length === list.length && d.list.every((x, i) => x === list[i]));
    if (deck) deck.modes.push(m);
    else decks.push({ modes: [m], list });
  }
  if (!decks.length) return null;
  const withAny = decks.flatMap((d) => d.modes);
  // Every mode has the same deck: no mode filter at all.
  const only = withAny.length === MODES.length ? undefined : withAny.join(" ");
  return (
    <SectionMotion preset="testimonials">
      <section
        id="testimonials"
        aria-labelledby="testimonials-title"
        data-node-id="249:2682"
        data-for={only}
        className="relative overflow-clip bg-midnight-950"
      >
        <div className="relative mx-auto flex h-1024 w-1440 items-center gap-40 pl-100 max-md:h-auto max-md:w-full max-md:flex-col max-md:items-start max-md:gap-40 max-md:px-20 max-md:py-80">
          <div className="flex w-493 shrink-0 flex-col gap-7 max-md:w-full">
            <div className="pl-11">
              <Heading barLeft="-0.1375em" barRight="-0.08em">
                <span id="testimonials-title">{t.heading}</span>
              </Heading>
            </div>
            <p data-lines className="text-h4 font-semibold text-midnight-100">
              {t.intro}
            </p>
          </div>

          {decks.length === 1 ? (
            <TestimonialDeck testimonials={decks[0].list} />
          ) : (
            decks.map((d) => <TestimonialDeck key={d.modes.join()} testimonials={d.list} mode={d.modes.join(" ")} />)
          )}
        </div>
      </section>
    </SectionMotion>
  );
}
