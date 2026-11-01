import type { Metadata } from "next";
import { Heading } from "@/components/ui";
import { CvSheet } from "@/components/cv/CvSheet";
import { Footer } from "@/components/sections/Footer";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "CV",
  description: `The CV of ${site.name}, ${site.role}.`,
};

/** The CV on the page, with the PDF a click away. */
export default function CvPage() {
  return (
    <>
      <main className="bg-midnight-950">
        <div className="container-x pt-200 pb-140 max-md:pt-110 max-md:pb-80">
          <Heading as="h1" size="text-h2">
            CV
          </Heading>
          <div className="mt-48 max-md:mt-28">
            <CvSheet />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
