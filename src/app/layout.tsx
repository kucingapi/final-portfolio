import type { Metadata, Viewport } from "next";
import { Cabin, Inter } from "next/font/google";
import { MODE_SCRIPT } from "@/components/mode/Mode";
import { getSiteContent } from "@/lib/content/read";
import "./globals.css";

const cabin = Cabin({ variable: "--font-cabin", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter-face", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getSiteContent();
  return { title: { default: site.title, template: `%s | ${site.name}` }, description: site.description };
}

export const viewport: Viewport = {
  themeColor: "#010326",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The head script sets data-mode before React loads, so <html>'s own attributes may differ.
    <html
      lang="en"
      data-covered="true"
      className={`${cabin.variable} ${inter.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Freelance / Full-time: apply the saved mode before first paint (see components/mode/Mode.tsx). */}
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
        {/* Chillax (clock, "Talk" wall, service cards) isn't on Google Fonts; it's served by Fontshare. */}
        <link
          rel="preconnect"
          href="https://api.fontshare.com"
          crossOrigin=""
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=chillax@400,600,700&display=swap"
        />
        <noscript>
          <style>{`[data-node-id="350:12239"]{display:none}header{visibility:visible!important}`}</style>
        </noscript>
      </head>
      {/* Browser extensions add classes to <body> before React loads (e.g. "vc-init"). This only
          ignores <body>'s own attributes; mismatches inside the page are still reported. The site's
          chrome is in (site)/layout.tsx, so the dashboard can leave it out. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
