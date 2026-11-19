import { describe, expect, it } from "vitest";
import type { CvContent } from "@/lib/content/schema";
import { variantSchema } from "@/lib/cv/schema";
import { checkVariant } from "@/lib/cv/variant";
import { normalizeProposal, proposalErrors } from "./proposal";

const cv = { entries: [], summaries: [], skills: [] } as unknown as CvContent;

describe("proposal on a variant", () => {
  it("is accepted by the variant schema with videos and a note", () => {
    const parsed = variantSchema.safeParse({
      proposal: { videos: [{ url: "https://youtu.be/dQw4w9WgXcQ", title: "The problem" }], note: "Hi Acme" },
    });
    expect(parsed.success).toBe(true);
  });

  it("needs at least one video, each with a title", () => {
    expect(variantSchema.safeParse({ proposal: { videos: [] } }).success).toBe(false);
    expect(variantSchema.safeParse({ proposal: { videos: [{ url: "https://youtu.be/dQw4w9WgXcQ" }] } }).success).toBe(false);
  });

  it("stores the video id, never the URL", () => {
    const p = normalizeProposal({
      videos: [
        { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "The problem" },
        { url: "https://youtu.be/9bZkp7q19f0", title: "My approach" },
      ],
      note: "Hi",
    });
    expect(p).toEqual({ videos: [{ id: "dQw4w9WgXcQ", title: "The problem" }, { id: "9bZkp7q19f0", title: "My approach" }], note: "Hi" });
  });

  it("keeps an id already stored, so a saved variant can be saved again", () => {
    expect(normalizeProposal({ videos: [{ id: "dQw4w9WgXcQ", title: "A" }] })).toEqual({ videos: [{ id: "dQw4w9WgXcQ", title: "A" }] });
  });

  it("refuses anything that isn't YouTube, naming the video", () => {
    const p = normalizeProposal({ videos: [{ url: "https://youtu.be/dQw4w9WgXcQ", title: "A" }, { url: "https://vimeo.com/1", title: "B" }] });
    const errors = proposalErrors(p);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/proposal\.videos\[2\].*vimeo\.com.*YouTube/);
    expect(checkVariant(cv, { proposal: p }, [])).toEqual(errors);
  });

  it("refuses the same video twice", () => {
    const p = normalizeProposal({ videos: [{ id: "dQw4w9WgXcQ", title: "A" }, { url: "https://youtu.be/dQw4w9WgXcQ", title: "B" }] });
    expect(proposalErrors(p)[0]).toMatch(/twice/);
  });
});
