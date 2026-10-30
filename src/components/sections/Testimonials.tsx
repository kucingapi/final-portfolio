import Image from "next/image";
import { Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { testimonials } from "@/content/site";

const card = "rounded-sm border-[calc(var(--s)*5)] border-midnight-50 bg-midnight-900 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]";

/** Testimonials (Figma 249:2682): heading on the left, a fanned stack of cards on the right. */
export function Testimonials() {
  const t = testimonials[0];
  return (
    <SectionMotion preset="testimonials">
      <section aria-labelledby="testimonials-title" data-node-id="249:2682" className="relative overflow-clip bg-midnight-950">
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

          <div className="relative h-413 w-707 shrink-0 max-md:h-auto max-md:w-full">
            <div data-stack-card aria-hidden className={`absolute top-0 left-42 h-413 w-622 max-md:left-[6%] max-md:w-[88%] max-md:h-[calc(100%-var(--s)*32)] ${card}`} />
            <div data-stack-card aria-hidden className={`absolute top-16 left-22 h-397 w-663 max-md:left-[3%] max-md:w-[94%] max-md:h-[calc(100%-var(--s)*16)] ${card}`} />
            <figure data-stack-card className={`absolute top-32 left-0 h-381 w-707 overflow-hidden max-md:relative max-md:h-auto max-md:w-full ${card}`}>
              <div data-quote className="flex h-full flex-col justify-between px-41 pt-32 pb-30 max-md:gap-32 max-md:p-24">
                <blockquote className="text-h4 font-semibold text-justify text-white max-md:text-left">{t.quote}</blockquote>
                <figcaption className="flex items-center gap-15">
                  <Image
                    src="/figma/testimonials/avatar.png"
                    alt=""
                    width={84}
                    height={84}
                    className="size-84 rounded-full border-[calc(var(--s)*5)] border-midnight-50 object-cover opacity-80"
                  />
                  <span className="flex flex-col gap-7 text-midnight-50">
                    <span className="text-lead font-semibold">{t.name}</span>
                    <span className="text-body">
                      {t.relation} - {t.role}
                    </span>
                  </span>
                </figcaption>
              </div>
            </figure>
          </div>
        </div>
      </section>
    </SectionMotion>
  );
}
