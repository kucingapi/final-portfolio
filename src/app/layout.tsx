import type { Metadata, Viewport } from "next";
import { Cabin, Inter } from "next/font/google";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { PageTransitionProvider } from "@/components/transition/PageTransition";
import { Navbar } from "@/components/Navbar";
import { site } from "@/content/site";
import "./globals.css";

const cabin = Cabin({ variable: "--font-cabin", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter-face", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: site.title, template: `%s — ${site.name}` },
  description: site.description,
};

export const viewport: Viewport = {
  themeColor: "#010326",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-covered="true" className={`${cabin.variable} ${inter.variable} antialiased`}>
      <head>
        {/* Chillax (clock, "Talk" wall, service cards) isn't on Google Fonts; it's served by Fontshare. */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=chillax@400,600,700&display=swap" />
        <noscript>
          <style>{`[data-node-id="350:12239"]{display:none}header{visibility:visible!important}`}</style>
        </noscript>
      </head>
      <body>
        <SmoothScroll>
          <PageTransitionProvider>
            <Navbar />
            <div className="page-canvas">{children}</div>
          </PageTransitionProvider>
        </SmoothScroll>
      </body>
    </html>
  );
}
