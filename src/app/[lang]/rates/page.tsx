import type { Metadata } from "next";
import { Heading } from "@/components/ui";
import { RateCardView } from "@/components/cv/RateCardView";
import { Footer } from "@/components/sections/Footer";
import { getSiteContent } from "@/lib/content/read";
import { getLang } from "@/lib/i18n/server";
import { ui } from "@/lib/i18n/ui";

/** Prices are made for one client, so the page stays out of search and the navbar. */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: ui(lang).rateCard.title, robots: { index: false, follow: false } };
}

/** A tailored link's rate card; without a link that has `rates`, only a short note. */
export default async function RatesPage() {
  const lang = await getLang();
  const { rateCard } = await getSiteContent(lang);
  return (
    <>
      <main className="bg-midnight-950">
        <div className="container-x pt-200 pb-140 max-md:pt-110 max-md:pb-80">
          <Heading as="h1" size="text-h2">
            {ui(lang).rateCard.title}
          </Heading>
          <div className="mt-48 max-md:mt-28">
            <RateCardView rateCard={rateCard} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
