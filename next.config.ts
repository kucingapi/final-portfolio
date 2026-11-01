import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // The Experiences page became Career.
  async redirects() {
    return [{ source: "/experiences", destination: "/career", permanent: true }];
  },
  partialPrefetching: true,
  // The PDF renderer loads fonts and layout code at runtime; keep it out of the server bundle.
  serverExternalPackages: ["@react-pdf/renderer"],
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
