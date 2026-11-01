import { z } from "zod";
import { CV_SECTIONS } from "@/content/cv";

/**
 * A variant is one tailored version of the CV and the site, made for one application. It only picks,
 * orders and chooses between lines that already exist in the master CV (src/content/cv.ts); the free
 * text it may carry is a headline and a summary. Everything is optional: leave a field out and the
 * default applies.
 */
export const variantSchema = z.object({
  /** The line under the name. One of `cvHeader.headlines`, or a short title of its own. */
  headline: z.string().trim().min(2).max(80).optional(),
  /** A summary paragraph of its own; wins over `summaryId`. */
  summary: z.string().trim().max(700).optional(),
  /** One of the stock summaries, by id. */
  summaryId: z.string().optional(),
  /** Which way the site opens: Freelance leads with projects, Full-time with career. */
  mode: z.enum(["freelance", "fulltime"]).optional(),
  /** CV sections in order; a section left out is hidden. */
  sections: z.array(z.enum(CV_SECTIONS)).optional(),
  /** Entry ids to show, in order within their sections. Entries left out are hidden. */
  entries: z.array(z.string()).optional(),
  /** Per entry, the bullet ids to show, in order. Entries not listed keep their default bullets. */
  bullets: z.record(z.string(), z.array(z.string())).optional(),
  /** Per entry, which of its allowed titles to use. */
  titles: z.record(z.string(), z.string()).optional(),
  /** Skill group ids in order; groups left out are hidden. */
  skills: z.array(z.string()).optional(),
  /** Site project slugs to lead with, in order; the rest follow in their usual order. */
  projects: z.array(z.string()).optional(),
});
