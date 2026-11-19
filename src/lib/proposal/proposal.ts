import type { z } from "zod";
import type { proposalSchema } from "@/lib/cv/schema";
import { isYouTubeId, youTubeId } from "./youtube";

/** A tailored link's proposal; see `proposalSchema` in src/lib/cv/schema.ts. Client-safe. */
export type Proposal = z.infer<typeof proposalSchema>;
export type ProposalVideo = Proposal["videos"][number];

/** A video as stored: its YouTube id and title. */
export type StoredVideo = { id: string; title: string };

/**
 * Each video's URL turned into its YouTube id, the URL dropped. A video whose URL isn't YouTube keeps it,
 * so proposalErrors can name it; such a proposal is never saved.
 */
export function normalizeProposal(p: Proposal): Proposal {
  return {
    ...p,
    videos: p.videos.map(({ url, id, title }) => {
      const found = id && isYouTubeId(id) ? id : url ? youTubeId(url) : null;
      return found ? { id: found, title } : { url, id, title };
    }),
  };
}

/** What is wrong with a normalized proposal; empty when it can be saved. */
export function proposalErrors(p: Proposal): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  p.videos.forEach((v, i) => {
    const at = `proposal.videos[${i + 1}]`;
    if (!v.id || !isYouTubeId(v.id) || v.url) {
      errors.push(`${at}: "${v.url ?? v.id}" is not a YouTube video link (watch?v=, youtu.be/, shorts/ or embed/). Upload it to YouTube as unlisted first.`);
      return;
    }
    if (seen.has(v.id)) errors.push(`${at}: the same video is listed twice.`);
    seen.add(v.id);
  });
  return errors;
}

/** The stored videos, in order (anything unparsed is left out). */
export const videosOf = (p: Proposal | undefined): StoredVideo[] =>
  (p?.videos ?? []).filter((v): v is StoredVideo => Boolean(v.id && isYouTubeId(v.id) && !v.url));
