import { Heading } from "@/components/ui";
import { SectionMotion } from "@/components/motion/SectionMotion";
import { getSiteContent } from "@/lib/content/read";
import { getLang } from "@/lib/i18n/server";
import { ui } from "@/lib/i18n/ui";
import { RateCardForm } from "./RateCardForm";

/**
 * Speaker / Teacher mode's Rate card. The prices are never on the page: a visitor asks for the rate card
 * with their name and email, and it lands in the dashboard's Inbox. Only the formats on offer are listed
 * (label and length), so the visitor knows what to ask about.
 */
export async function RateCardRequest() {
  const lang = await getLang();
  const t = ui(lang).rateRequest;
  const { rateCard, site } = await getSiteContent(lang);
  return (
    <SectionMotion preset="rateRequest">
      <section id="rate-card" data-for="speaker" aria-labelledby="rate-card-title" className="relative overflow-clip bg-midnight-950">
        <div className="relative mx-auto flex w-1440 gap-100 px-100 py-160 max-md:w-full max-md:flex-col max-md:gap-48 max-md:px-20 max-md:py-80">
          <div className="flex w-520 shrink-0 flex-col gap-24 max-md:w-full">
            <Heading barLeft="-0.1375em" barRight="-0.08em">
              <span id="rate-card-title">{t.heading}</span>
            </Heading>
            <p data-lines className="text-h4 font-semibold text-midnight-100">
              {t.intro}
            </p>
            <div className="mt-16 max-md:mt-8">
              <p className="text-lead font-semibold text-midnight-200">{t.formats}</p>
              <ul className="mt-12 flex flex-col">
                {rateCard.formats.map((f) => (
                  <li key={f.id} data-row className="flex items-baseline justify-between gap-24 border-b border-midnight-50/25 py-12 text-lead text-midnight-50">
                    <span>{f.label}</span>
                    {f.duration && <span className="shrink-0 text-midnight-200">{f.duration}</span>}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-body text-midnight-200">{t.privacy}</p>
          </div>

          <RateCardForm email={site.email} />
        </div>
      </section>
    </SectionMotion>
  );
}
