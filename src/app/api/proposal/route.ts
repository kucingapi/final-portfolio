import { after } from "next/server";
import { fromTester, getVariant } from "@/lib/cv/store";
import { report } from "@/lib/dashboard/activity";
import { visitFrom } from "@/lib/dashboard/posthog";
import { describeClick, isBot } from "@/lib/dashboard/visitor";
import { parsePing } from "@/lib/proposal/ping";
import { viewingDetail } from "@/lib/proposal/viewing";

/**
 * A proposal page (src/app/[lang]/proposal) says a viewing started, or how it went when it ended. Both
 * are forwarded to the feed and the phone, with the visit's PostHog session for the replay; nothing else
 * about watching is kept here (the watch data itself lives in PostHog only). Sent with sendBeacon when
 * the page is hidden, so it answers 204 whatever happens and never makes the visitor wait.
 */
export async function POST(request: Request) {
  const done = new Response(null, { status: 204 });
  if (request.headers.get("sec-fetch-site") === "cross-site") return done;
  const ping = parsePing(await request.json().catch(() => null));
  if (!ping || fromTester(request) || isBot(request)) return done;
  const row = await getVariant(ping.v);
  if (!row?.variant.proposal) return done;
  const { at, country, device } = describeClick(request);
  const visit = visitFrom(request);
  after(() =>
    report({
      kind: ping.type === "start" ? "proposalStart" : "proposalViewing",
      ref: `cv:${row.code}`,
      name: row.label,
      detail: ping.type === "end" ? viewingDetail(ping.summary) : undefined,
      at,
      country,
      device,
      ...visit,
    }),
  );
  return done;
}
