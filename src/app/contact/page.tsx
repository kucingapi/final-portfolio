import type { Metadata } from "next";
import { ContactFlow } from "@/components/contact/ContactFlow";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Start a design, web or mobile project with ${site.name}.`,
};

export default function ContactPage() {
  return (
    <main className="bg-midnight-950">
      <ContactFlow />
    </main>
  );
}
