import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
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
  // The portfolio PDF reads its font and the site's images from disk.
  outputFileTracingIncludes: {
    "/api/portfolio": ["./src/lib/portfolio/fonts/*", "./public/projects/**/*", "./public/figma/hero/photo-main.webp"],
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
