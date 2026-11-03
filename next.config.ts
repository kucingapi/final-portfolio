import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
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
    ];
  },
  // The Experiences page became Career.
  async redirects() {
    return [{ source: "/experiences", destination: "/career", permanent: true }];
  },
  // PostHog through this site (src/lib/analytics.ts), so ad blockers don't drop it. Assets first.
  async rewrites() {
    return [
      { source: "/relay/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
      { source: "/relay/array/:path*", destination: "https://eu-assets.i.posthog.com/array/:path*" },
      { source: "/relay/:path*", destination: "https://eu.i.posthog.com/:path*" },
    ];
  },
  // PostHog's API paths end in a slash; redirecting them would break the proxy.
  skipTrailingSlashRedirect: true,
  partialPrefetching: true,
  // AVIF first, about a fifth smaller than WebP for photos. Resized copies keep for 30 days, so a
  // replaced photo should take a new file name.
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
