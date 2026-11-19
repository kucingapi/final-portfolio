import { z } from "zod";
import { describeViewing, type ViewingSummary } from "./viewing";
import type { PingBody } from "./watch";

/**
 * The two things a proposal page tells the server (see /api/proposal): a viewing started, and how it
 * went when it ended. The server only forwards them to the feed and the phone; it keeps nothing else.
 */

const HOURS = 24 * 3600;
const viewing = z.string().min(1).max(64).regex(/^[\w-]+$/);
const summarySchema = z
  .object({
    videos: z.number().int().min(1).max(10),
    played: z.number().int().min(0).max(10),
    watched: z.number().min(0).max(HOURS),
    total: z.number().min(0).max(HOURS),
    last: z.object({ video: z.number().int().min(1).max(10), at: z.number().min(0).max(HOURS), ended: z.boolean() }).optional(),
  })
  .refine((s) => s.played <= s.videos && (!s.last || s.last.video <= s.videos));

const pingSchema = z.discriminatedUnion("type", [
  z.object({ v: z.string().max(16), type: z.literal("start"), viewing }),
  z.object({ v: z.string().max(16), type: z.literal("end"), viewing, summary: summarySchema }),
]);

export function parsePing(body: unknown): PingBody | null {
  const parsed = pingSchema.safeParse(body);
  return parsed.success ? (parsed.data as PingBody) : null;
}

/** The feed line and the ping's body: "Acme started your proposal", or the viewing's summary. */
export function describePing(name: string, p: PingBody): string {
  return p.type === "start" ? `${name} started your proposal` : describeViewing(name, p.summary as ViewingSummary);
}
