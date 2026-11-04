"use client";

import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

/** Short confirmations ("Copied", "Saved"), at the top so the phone's tab bar never hides them. */
export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      style={
        {
          fontFamily: "var(--font-sans)",
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "0.875rem",
        } as React.CSSProperties
      }
    />
  );
}
