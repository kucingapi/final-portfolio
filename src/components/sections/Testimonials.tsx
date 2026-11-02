import { Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { TestimonialDeck } from "./TestimonialDeck";

/** Testimonials (Figma 249:2682): heading on the left, the fanned card deck on the right. */
export function Testimonials() {
  return (
    <SectionMotion preset="testimonials">
      <section id="testimonials" aria-labelledby="testimonials-title" data-node-id="249:2682" className="relative overflow-clip bg-midnight-950">
        <div className="relative mx-auto flex h-1024 w-1440 items-center gap-40 pl-100 max-md:h-auto max-md:w-full max-md:flex-col max-md:items-start max-md:gap-40 max-md:px-20 max-md:py-80">
          <div className="flex w-493 shrink-0 flex-col gap-7 max-md:w-full">
            <div className="pl-11">
              <Heading barLeft="-0.1375em" barRight="-0.08em">
                <span id="testimonials-title">Testimonials</span>
              </Heading>
            </div>
            <p data-lines className="text-h4 font-semibold text-midnight-100">
              What they say when working with me
            </p>
          </div>

          <TestimonialDeck />
        </div>
      </section>
    </SectionMotion>
  );
}
