import type { Metadata, Viewport } from "next";
import { MODE_SCRIPT } from "@/components/mode/Mode";
import { SiteChrome } from "@/components/SiteChrome";
import { getSiteContent } from "@/lib/content/read";
import { LANGS, LOCALES } from "@/lib/i18n/lang";
import { SITE_URL, langParam } from "@/lib/i18n/meta";
import { fontVariables } from "../fonts";
import "../globals.css";

/**
 * The portfolio's root layout, once per language: English at the root addresses, Bahasa Indonesia under
 * /id (next.config.ts maps the unprefixed addresses onto /en). The dashboard has a root layout of its own.
 */
export async function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const lang = langParam((await params).lang);
  const { site } = await getSiteContent(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: site.title, template: `%s | ${site.name}` },
    description: site.description,
    openGraph: { locale: lang === "id" ? "id_ID" : "en_US", siteName: site.name },
  };
}

export const viewport: Viewport = {
  themeColor: "#010326",
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const lang = langParam((await params).lang);
  return (
    // The head script sets data-mode before React loads, so <html>'s own attributes may differ.
    <html lang={LOCALES[lang]} data-covered="true" className={`${fontVariables} antialiased`} suppressHydrationWarning>
      <head>
        {/* Freelance / Full-time: apply the saved mode before first paint (see components/mode/Mode.tsx). */}
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
        {/* Chillax's Fontshare stylesheet is linked by SiteChrome, so the dashboard doesn't load it. */}
        <noscript>
          <style>{`[data-node-id="350:12239"]{display:none}header{visibility:visible!important}`}</style>
        </noscript>
      </head>
      {/* Browser extensions add classes to <body> before React loads (e.g. "vc-init"). This only
          ignores <body>'s own attributes; mismatches inside the page are still reported. */}
      <body suppressHydrationWarning>
        <SiteChrome lang={lang}>{children}</SiteChrome>
      </body>
    </html>
  );
}
