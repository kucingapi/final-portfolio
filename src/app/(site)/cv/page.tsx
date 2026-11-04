import type { Metadata } from "next";
import { Heading } from "@/components/ui";
import { CvSheet } from "@/components/cv/CvSheet";
import { Footer } from "@/components/sections/Footer";
import { getCvContent, getSiteContent } from "@/lib/content/read";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteContent();
  return { title: "CV", description: `The CV of ${site.name}, ${site.role}.` };
}

/** The CV on the page, with the PDF a click away. */
export default async function CvPage() {
  const content = await getCvContent();
  return (
    <>
      <main className="bg-midnight-950">
        <div className="container-x pt-200 pb-140 max-md:pt-110 max-md:pb-80">
          <Heading as="h1" size="text-h2">
            CV
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
