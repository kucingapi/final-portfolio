import type { Metadata } from "next";
import { MODE_SCRIPT } from "@/components/mode/Mode";
import { SiteChrome } from "@/components/SiteChrome";
import { TransitionLink } from "@/components/transition/PageTransition";
import { UI } from "@/lib/i18n/ui";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = { title: "404" };

/**
 * Addresses no route answers (the site's pages live under app/[lang], each with a root layout of its own,
 * so there is no single layout to render them in). They keep the site's navbar, as they always did; the
 * address could be in either language, so the line says it in both. A missing project inside a language
 * gets that language's own 404 (app/[lang]/not-found.tsx).
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" data-covered="true" className={`${fontVariables} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <SiteChrome lang="en">
          <main className="grid min-h-screen place-items-center px-24 text-center">
            <p className="text-lead text-midnight-100">
              <span className="font-semibold text-midnight-50">404</span> · {UI.en.notFound}{" "}
              <span lang="id">{UI.id.notFound}</span>{" "}
              <TransitionLink href="/" className="font-semibold text-midnight-50 underline underline-offset-4">
                {UI.en.nav.home}
              </TransitionLink>
            </p>
          </main>
        </SiteChrome>
      </body>
    </html>
  );
}
