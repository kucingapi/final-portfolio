import { loadAnalytics } from "@/lib/analytics";

// Runs before the app is interactive, while a tailored link's `?v=` is still in the address bar
// (VariantLoader removes it on hydration), so the landing pageview can carry the code.
try {
  const code = new URLSearchParams(window.location.search).get("v");
  void loadAnalytics(code ? { v_code: code } : undefined);
} catch {}
