import type { Metadata } from "next";
import { SiteChrome } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Not found" };

/** Unknown addresses keep the site's navbar, as they did before the pages moved into (site). */
export default function NotFound() {
  return (
    <SiteChrome>
      <main className="grid min-h-screen place-items-center px-24 text-center">
        <p className="text-lead text-midnight-100">
          <span className="font-semibold text-midnight-50">404</span> · This page could not be found.
        </p>
      </main>
    </SiteChrome>
  );
}
