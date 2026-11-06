import { Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import type { Mode } from "@/content/site";
import { getSiteContent } from "@/lib/content/read";
import { getLang } from "@/lib/i18n/server";
import { ui } from "@/lib/i18n/ui";
import { MODES } from "@/lib/content/schema";
import { TestimonialDeck } from "./TestimonialDeck";

/**
 * Testimonials (Figma 249:2682): heading on the left, the fanned card deck on the right. Each one shows
 * in Freelance mode, Full-time mode or both. When the two modes' lists differ, each mode gets its own
 * deck (`data-for`, like the rest of the mode copy), and a mode with none hides the section.
 */
export async function Testimonials() {
  const lang = await getLang();
  const t = ui(lang).home.testimonials;
  const { testimonials } = await getSiteContent(lang);
  const shownIn = (m: Mode) => testimonials.filter((t) => !t.mode || t.mode === "both" || t.mode === m);
  const lists = { freelance: shownIn("freelance"), fulltime: shownIn("fulltime") };
  if (!lists.freelance.length && !lists.fulltime.length) return null;
  const only = !lists.fulltime.length ? "freelance" : !lists.freelance.length ? "fulltime" : undefined;
  const same = lists.freelance.length === lists.fulltime.length && lists.freelance.every((t, i) => t === lists.fulltime[i]);
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

          {same || only ? (
            <TestimonialDeck testimonials={lists[only ?? "freelance"]} />
          ) : (
            MODES.map((m) => <TestimonialDeck key={m} testimonials={lists[m]} mode={m} />)
          )}
        </div>
      </section>
    </SectionMotion>
  );
}
