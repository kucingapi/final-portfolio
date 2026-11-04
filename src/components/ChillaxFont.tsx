"use client";

/**
 * Chillax (clock, "Talk" wall, service cards) isn't on Google Fonts; it's served by Fontshare. That's a
 * third-party stylesheet that can't carry an integrity hash, so only the portfolio loads it, never the
 * dashboard. React puts both links in <head>, and the precedence keeps the stylesheet render-blocking
 * there, as it was in the root layout.
 *
 * A client component on purpose: the root not-found page renders SiteChrome, so its tree travels in
 * every page's server payload, the dashboard's too. Rendered by a server component, the stylesheet
 * would go out from there as a preload hint, and the dashboard would still fetch it.
 */
export function ChillaxFont() {
  return (
    <>
      <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://api.fontshare.com/v2/css?f[]=chillax@400,600,700&display=swap"
        precedence="default"
      />
    </>
  );
}
