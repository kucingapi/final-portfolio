import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/dashboard/ui/toaster";

/**
 * Novel's private dashboard: never indexed, never in a sitemap, and installable on his phone as an app
 * of its own (the manifest opens it at /dashboard, full screen). None of the site's chrome loads here.
 */
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  manifest: "/dashboard/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Dashboard", statusBarStyle: "black-translucent" },
  icons: { apple: "/dashboard/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#010326",
  // Edge to edge on phones; the safe-area insets keep content off the notch and the home bar.
  viewportFit: "cover",
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="dash min-h-dvh bg-background font-sans text-foreground antialiased">
      {children}
      <Toaster />
    </div>
  );
}
