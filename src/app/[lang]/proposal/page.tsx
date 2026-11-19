import type { Metadata } from "next";
import { Heading } from "@/components/ui";
import { ProposalView } from "@/components/proposal/ProposalView";
import { Footer } from "@/components/sections/Footer";
import { getLang } from "@/lib/i18n/server";
import { ui } from "@/lib/i18n/ui";

/** A proposal is made for one client, so the page stays out of search and the navbar. */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: ui(lang).proposal.title, robots: { index: false, follow: false } };
}

/** A tailored link's proposal videos; without a link that has a proposal, only a short note. */
export default async function ProposalPage() {
  const lang = await getLang();
  return (
    <>
      <main className="bg-midnight-950">
        <div className="container-x pt-200 pb-140 max-md:pt-110 max-md:pb-80">
          <Heading as="h1" size="text-h2">
            {ui(lang).proposal.title}
          </Heading>
          <div className="mt-48 max-md:mt-28">
            <ProposalView />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
