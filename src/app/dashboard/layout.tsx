import type { Metadata } from "next";

/** Novel's private dashboard: never indexed, never in a sitemap. */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return <main className="min-h-screen bg-midnight-950 pt-180 pb-140 max-md:pt-110 max-md:pb-80">{children}</main>;
}
