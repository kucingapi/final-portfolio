import type { ReactNode } from "react";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { PageTransitionProvider } from "@/components/transition/PageTransition";
import { Navbar } from "@/components/Navbar";
import { ModeProvider } from "@/components/mode/Mode";
import { VariantLoader } from "@/components/cv/Variant";
import { getCvContent, getSiteContent, getTranslations } from "@/lib/content/read";
import { variantNames } from "@/lib/cv/variant";
import { LangProvider } from "@/lib/i18n/client";
import type { Lang } from "@/lib/i18n/lang";
import { PreviewBadge } from "@/components/PreviewBadge";
import { ChillaxFont } from "@/components/ChillaxFont";
import { MODES, type Mode } from "@/lib/modes";

/**
 * The portfolio around its pages: the language, Freelance / Full-time / Speaker mode, tailored links, smooth scroll,
 * the page transition and the navbar. The dashboard is an app of its own and leaves all of it out.
 */
export async function SiteChrome({ lang, children }: { lang: Lang; children: ReactNode }) {
  const [{ site, modes }, cv, dict] = await Promise.all([getSiteContent(lang), getCvContent(), getTranslations(lang)]);
  return (
    <LangProvider lang={lang} names={variantNames(cv, dict, lang)}>
      <ChillaxFont />
      <ModeProvider>
        <VariantLoader />
        <SmoothScroll>
          <PageTransitionProvider>
            <Navbar owner={{ name: site.name, email: site.email }} modeLabels={Object.fromEntries(MODES.map((m) => [m, modes[m].label])) as Record<Mode, string>} />
            <div className="page-canvas">{children}</div>
            <PreviewBadge />
          </PageTransitionProvider>
        </SmoothScroll>
      </ModeProvider>
    </LangProvider>
  );
}
