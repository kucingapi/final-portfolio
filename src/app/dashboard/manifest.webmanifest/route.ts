import { site } from "@/content/site";

/** Lets the dashboard go on a phone's home screen as its own app, opening straight into /dashboard. */
export function GET() {
  return Response.json(
    {
      id: "/dashboard",
      name: `${site.name} · Dashboard`,
      short_name: "Dashboard",
      description: "Short links, tailored CV links, and who opened them.",
      start_url: "/dashboard",
      scope: "/dashboard",
      display: "standalone",
      background_color: "#010326",
      theme_color: "#010326",
      icons: [
        { src: "/dashboard/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/dashboard/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/dashboard/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
