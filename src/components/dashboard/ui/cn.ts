import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The site's own type sizes (text-h4, text-chip…) are sizes, not colours: tell tailwind-merge so it
// doesn't drop one when a colour class follows.
const merge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["h1", "h2", "h3", "h4", "lead", "body", "chip", "clock", "mega", "service"] }] } },
});

export const cn = (...inputs: ClassValue[]) => merge(clsx(inputs));
