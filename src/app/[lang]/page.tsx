import { Hero } from "@/components/sections/Hero";
import { Projects } from "@/components/sections/Projects";
import { Career } from "@/components/sections/Career";
import { ModeSlot } from "@/components/mode/ModeSlot";
import { Philosophy } from "@/components/sections/Philosophy";
import { MoreDetail } from "@/components/sections/MoreDetail";
import { Testimonials } from "@/components/sections/Testimonials";
import { LetsTalk } from "@/components/sections/LetsTalk";
import { Footer } from "@/components/sections/Footer";
import type { Metadata } from "next";
import { alternates } from "@/lib/i18n/meta";
import { getLang } from "@/lib/i18n/server";

/** The title and description come from the layout; the home page adds its address in each language. */
export async function generateMetadata(): Promise<Metadata> {
  return { alternates: alternates(await getLang(), "/") };
}

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        {/* Freelance mode leads with projects, Full-time with the career. */}
        <ModeSlot>
          <Projects />
          <Career />
        </ModeSlot>
        <Philosophy />
        <MoreDetail />
        <Testimonials />
        <LetsTalk />
      </main>
      <Footer />
    </>
  );
}
