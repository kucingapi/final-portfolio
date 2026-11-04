import type { Metadata } from "next";
import { ContactFlow } from "@/components/contact/ContactFlow";
import { getSiteContent } from "@/lib/content/read";

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteContent();
  return { title: "Contact", description: `Start a design, web or mobile project with ${site.name}.` };
}

export default async function ContactPage() {
  const { site } = await getSiteContent();
  return (
    <main className="bg-midnight-950">
      <ContactFlow email={site.email} />
    </main>
  );
}
