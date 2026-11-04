import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs before next.config.ts's rewrites, which pass /relay/* on to PostHog with the request's headers.
 * The browser sends this site's cookies with those requests, the dashboard session among them, and
 * PostHog has no use for any of them (posthog-js puts its ids in the payload), so they stop here.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("cookie");
  headers.delete("authorization");
  return NextResponse.next({ request: { headers } });
}

// The rewrites match their source in any case (/RELAY/e/ reaches PostHog too), but a matcher only in the
// case it's written, so it spells out both cases of each letter.
export const config = { matcher: "/:relay([rR][eE][lL][aA][yY])/:path*" };
