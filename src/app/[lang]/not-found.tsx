import type { Metadata } from "next";
import { TransitionLink } from "@/components/transition/PageTransition";
import { getLang } from "@/lib/i18n/server";
import { ui } from "@/lib/i18n/ui";

export const metadata: Metadata = { title: "404" };

/** Unknown addresses keep the site's navbar, in the language their address is in. */
export default async function NotFound() {
  const t = ui(await getLang());
  return (
    <main className="grid min-h-screen place-items-center px-24 text-center">
      <p className="text-lead text-midnight-100">
        <span className="font-semibold text-midnight-50">404</span> · {t.notFound}{" "}
        <TransitionLink href="/" className="font-semibold text-midnight-50 underline underline-offset-4">
          {t.nav.home}
        </TransitionLink>
      </p>
    </main>
  );
}
