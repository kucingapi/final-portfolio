import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The pages live under app/[lang], one root layout per language, so addresses no route answers get
  // app/global-not-found.tsx.
  experimental: { globalNotFound: true },
  // Safe everywhere: no MIME sniffing, no full URLs (which can carry a ?v= code) sent to other sites, and
  // no camera, microphone or location for any page. The dashboard may never be framed, and sends no
  // referrer at all, as its setup links carry a one-time token.
  async headers() {
    const site = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
    ];
    const dashboard = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [
      { source: "/:path*", headers: site },
      { source: "/dashboard", headers: dashboard },
      { source: "/dashboard/:path*", headers: dashboard },
      { source: "/api/dashboard/:path*", headers: dashboard },
      // The images scripts/images.mjs builds carry a hash of their source in the name, so browsers can
      // keep them for a year without asking again.
      { source: "/img/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
  async redirects() {
    return [
      // The Experiences page became Career.
      { source: "/experiences", destination: "/career", permanent: true },
      { source: "/id/experiences", destination: "/id/career", permanent: true },
      // English has no prefix of its own; /en/… is only the internal address the rewrite below serves.
      { source: "/en", destination: "/", permanent: false },
      { source: "/en/:path*", destination: "/:path*", permanent: false },
    ];
  },
  async rewrites() {
    return [
      // PostHog through this site (src/lib/analytics.ts), so ad blockers don't drop it. Assets first.
      { source: "/relay/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
      { source: "/relay/array/:path*", destination: "https://eu-assets.i.posthog.com/array/:path*" },
      { source: "/relay/:path*", destination: "https://eu.i.posthog.com/:path*" },
      // The site's pages live under app/[lang]: Bahasa Indonesia at /id/…, English at the plain addresses,
      // served from /en/…. These run after files and fixed routes (public/, the dashboard, API routes), so
      // only page addresses reach them; the dynamic routes outside [lang] are named so they keep theirs.
      { source: "/", destination: "/en" },
      { source: "/:path((?!(?:en|id|api|go|relay|_next)(?:/|$)).*)", destination: "/en/:path" },
    ];
  },
  // PostHog's API paths end in a slash; redirecting them would break the proxy.
  skipTrailingSlashRedirect: true,
  partialPrefetching: true,
  // For images without built files (src/components/Picture.tsx), and browsers without AVIF. AVIF
  // first, about a fifth smaller than WebP for photos. Resized copies keep for 30 days, so a replaced
  // photo should take a new file name.
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2592000,
  },
  // The PDF renderer loads fonts and layout code at runtime; keep it out of the server bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
  // The portfolio PDF reads its font and the site's images from disk, and so does the dashboard's
  // image export.
  outputFileTracingIncludes: {
    "/api/portfolio": ["./src/lib/portfolio/fonts/*", "./public/projects/**/*", "./public/figma/hero/photo-main.webp"],
    "/api/dashboard/projects/\\[slug\\]": ["./public/projects/**/*"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
