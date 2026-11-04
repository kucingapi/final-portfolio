"use client";

import { useSyncExternalStore } from "react";

const previewing = () => document.cookie.split("; ").includes("nb_preview=1");
const never = () => () => {};

/**
 * While the dashboard's Preview has the site showing drafts, a pill says so and turns it off. It reads a
 * cookie in the browser, so the pages themselves stay static.
 */
export function PreviewBadge() {
  const on = useSyncExternalStore(never, previewing, () => false);
  if (!on) return null;
  return (
    <a
      href={`/api/dashboard/preview?exit=1&path=${encodeURIComponent(window.location.pathname)}`}
      className="fixed bottom-24 left-24 z-[100] rounded-full bg-white px-20 py-10 font-inter text-chip font-semibold text-midnight-950 shadow-[0_8px_24px_rgb(1_3_38/0.45)] max-md:bottom-16 max-md:left-16"
    >
      Showing drafts · Exit
    </a>
  );
}
