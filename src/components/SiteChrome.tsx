import type { ReactNode } from "react";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { PageTransitionProvider } from "@/components/transition/PageTransition";
import { Navbar } from "@/components/Navbar";
import { ModeProvider } from "@/components/mode/Mode";
import { VariantLoader } from "@/components/cv/Variant";

/**
 * The portfolio around its pages: Freelance/Full-time mode, tailored links, smooth scroll, the page
 * transition and the navbar. The dashboard is an app of its own and leaves all of it out.
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <ModeProvider>
      <VariantLoader />
      <SmoothScroll>
        <PageTransitionProvider>
          <Navbar />
          <div className="page-canvas">{children}</div>
        </PageTransitionProvider>
      </SmoothScroll>
    </ModeProvider>
  );
}
