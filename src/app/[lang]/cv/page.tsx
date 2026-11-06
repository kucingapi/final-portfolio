import type { Metadata } from "next";
import { Heading } from "@/components/ui";
import { CvSheet } from "@/components/cv/CvSheet";
import { Footer } from "@/components/sections/Footer";
import { getCvContent, getSiteContent } from "@/lib/content/read";
import { alternates } from "@/lib/i18n/meta";
import { getLang } from "@/lib/i18n/server";
import { ui } from "@/lib/i18n/ui";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const { site } = await getSiteContent(lang);
  const t = ui(lang).meta.cv;
  return { title: t.title, description: t.description(site.name, site.role), alternates: alternates(lang, "/cv") };
}

/** The CV on the page, with the PDF a click away. */
export default async function CvPage() {
  const lang = await getLang();
  const content = await getCvContent(lang);
  return (
    <>
      <main className="bg-midnight-950">
        <div className="container-x pt-200 pb-140 max-md:pt-110 max-md:pb-80">
          <Heading as="h1" size="text-h2">
            {ui(lang).cv.heading}
          </Heading>
          <div className="mt-48 max-md:mt-28">
            <CvSheet content={content} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
