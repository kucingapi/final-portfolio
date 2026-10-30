import { Hero } from "@/components/sections/Hero";
import { Projects } from "@/components/sections/Projects";
import { About } from "@/components/sections/About";
import { CoreValues } from "@/components/sections/CoreValues";
import { MoreDetail } from "@/components/sections/MoreDetail";
import { Testimonials } from "@/components/sections/Testimonials";
import { LetsTalk } from "@/components/sections/LetsTalk";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <>
      <main>
        <Hero />
        <Projects />
        <About />
        <CoreValues />
        <MoreDetail />
        <Testimonials />
        <LetsTalk />
      </main>
      <Footer />
    </>
  );
}
