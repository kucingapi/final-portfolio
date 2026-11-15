import { z } from "zod";
import { CV_SECTIONS } from "@/lib/content/schema";
import { LANGS } from "@/lib/i18n/lang";
import { MODES } from "@/lib/modes";

/**
 * Size caps, all well above what the master CV holds (about 20 entries, 15 bullets and a dozen stack items
 * per entry, 6 skill groups, a dozen projects), so a real variant never meets them. They only stop a
 * request from carrying megabytes of ids that would be parsed, checked and rendered before being refused.
 */
const id = z.string().max(64);
const ids = (max: number) => z.array(id).max(max);
const MAX_KEYS = 50;
const byId = <T extends z.ZodType>(value: T) =>
  z.record(id, value).refine((r) => Object.keys(r).length <= MAX_KEYS, { message: `At most ${MAX_KEYS} keys.` });

export const RATE_CURRENCIES = ["IDR", "USD", "EUR"] as const;

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
  summaryId: id.optional(),
  /** Which way the site opens: Freelance leads with projects, Full-time with career, Speaker / Teacher with talks and classes. */
  mode: z.enum(MODES).optional(),
  /**
   * The language the link opens the site in, and of the CV and portfolio PDFs: "id" for Bahasa Indonesia.
   * The headline and summary are written in it; read in the other language, a stock summary stands in.
   */
  lang: z.enum(LANGS).optional(),
  /** CV sections in order; a section left out is hidden. */
  sections: z.array(z.enum(CV_SECTIONS)).max(CV_SECTIONS.length).optional(),
  /** Entry ids to show, in order within their sections. Entries left out are hidden. */
  entries: ids(50).optional(),
  /** Per entry, the bullet ids to show, in order. Entries not listed keep their default bullets. */
  bullets: byId(ids(32)).optional(),
  /** Per entry, which of its allowed titles to use. */
  titles: byId(z.string().max(120)).optional(),
  /** Per entry, the "Tech:" line: items from its stack, in order, the job's tools first. Empty hides it. */
  stacks: byId(ids(32)).optional(),
  /**
   * Per education entry, the course ids to list as "Relevant coursework", in order, the job's closest
   * first. An entry not listed shows no coursework.
   */
  courses: byId(ids(40)).optional(),
  /** Skill group ids in order; groups left out are hidden. */
  skills: ids(20).optional(),
  /** Per skill group, which of its items to show, in order, the job's requirements first. */
  skillItems: byId(ids(32)).optional(),
  /**
   * Site project slugs to lead with, in order; the rest follow in their usual order. The first four with
   * a device render lead the home page's grid and the projects page; the first three make the PDF deck.
   */
  projects: ids(50).optional(),
  /**
   * Per project slug, the chapter whose figure (before → after) becomes the project's headline number,
   * on the projects page and in the deck, instead of its usual one.
   */
  stats: byId(id).optional(),
  /** Per project slug, the chapters the PDF deck shows for it (up to three), in order. */
  chapters: byId(ids(3)).optional(),
  /**
   * False hides the email, GitHub and LinkedIn on the CV and both PDFs, for platforms such as Upwork that
   * bar sharing contact details. The location, the site and the Upwork profile stay.
   */
  contact: z.boolean().optional(),
  /** A rate card for this link: formats from the master, in order, each with this client's price. */
  rates: z
    .object({
      currency: z.enum(RATE_CURRENCIES),
      items: z.array(z.object({ id, price: z.number().positive().max(1_000_000_000) })).min(1).max(12),
      /** Master note ids to print under the table, in order. */
      notes: ids(8).optional(),
    })
    .optional(),
});
