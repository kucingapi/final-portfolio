import type { ReactNode } from "react";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { PageTransitionProvider } from "@/components/transition/PageTransition";
import { Navbar } from "@/components/Navbar";
import { ModeProvider } from "@/components/mode/Mode";
import { VariantLoader } from "@/components/cv/Variant";
import { getSiteContent } from "@/lib/content/read";
import { PreviewBadge } from "@/components/PreviewBadge";
import { ChillaxFont } from "@/components/ChillaxFont";

/**
 * The portfolio around its pages: Freelance/Full-time mode, tailored links, smooth scroll, the page
 * transition and the navbar. The dashboard is an app of its own and leaves all of it out.
 */
export async function SiteChrome({ children }: { children: ReactNode }) {
  const { site, modes } = await getSiteContent();
  return (
    <>
      <ChillaxFont />
      <ModeProvider>
        <VariantLoader />
        <SmoothScroll>
          <PageTransitionProvider>
            <Navbar owner={{ name: site.name, email: site.email }} modeLabels={{ freelance: modes.freelance.label, fulltime: modes.fulltime.label }} />
            <div className="page-canvas">{children}</div>
            <PreviewBadge />
          </PageTransitionProvider>
        </SmoothScroll>
      </ModeProvider>
    </>
  );
}
