import type { Metadata } from "next";
import { ContactFlow } from "@/components/contact/ContactFlow";
import { getSiteContent } from "@/lib/content/read";
import { alternates } from "@/lib/i18n/meta";
import { getLang } from "@/lib/i18n/server";
import { ui } from "@/lib/i18n/ui";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const { site } = await getSiteContent(lang);
  const t = ui(lang).meta.contact;
  return { title: t.title, description: t.description(site.name), alternates: alternates(lang, "/contact") };
}

export default async function ContactPage() {
  const { site } = await getSiteContent(await getLang());
  return (
    <main className="bg-midnight-950">
      <ContactFlow email={site.email} />
    </main>
  );
}
