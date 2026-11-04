import { loadAnalytics } from "@/lib/analytics";

// Runs before the app is interactive, while a tailored link's `?v=` is still in the address bar
// (VariantLoader removes it on hydration), so the landing pageview can carry the code. The dashboard is
// Novel's own and is never tracked (its setup links carry a one-time token, too).
try {
  if (!window.location.pathname.startsWith("/dashboard")) {
    const code = new URLSearchParams(window.location.search).get("v");
    void loadAnalytics(code ? { v_code: code } : undefined);
  }
} catch {}
