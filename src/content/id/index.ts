import { cvId } from "./cv";
import { projectsId } from "./projects";
import { siteId } from "./site";

/**
 * Bahasa Indonesia as it ships with the code, keyed by the English text it translates (see
 * src/lib/i18n/translate.ts). The dashboard (Content → Bahasa) and agents edit it from there; once a
 * version is published, that one wins. Testimonials stay as they were said, and dates translate on their
 * own, so neither is listed here.
 */
export const bahasaStrings: Record<string, string> = { ...siteId, ...cvId, ...projectsId };
