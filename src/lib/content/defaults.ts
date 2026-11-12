import { cvEntries, cvHeader, cvSkills, cvSummaries } from "@/content/cv";
import { bahasaStrings } from "@/content/id";
import { projects } from "@/content/projects";
import { about, career, careerDetail, modes, philosophy, rateCard, site, testimonials } from "@/content/site";
import type { DocContent } from "./schema";

/** The content as it ships with the code (src/content): what the site shows until a document is first published. */
export const DEFAULTS: DocContent = {
  site: { site, about, philosophy, testimonials, modes, career, careerDetail, rateCard },
  cv: { header: cvHeader, summaries: cvSummaries, entries: cvEntries, skills: cvSkills },
  projects: { projects },
  bahasa: { strings: bahasaStrings },
};
