import { userAgent } from "next/server";
import { report } from "./activity";
import { visitFrom } from "./posthog";
import type { Click, Device } from "./links";

/**
 * Who followed a short link. Link previews are not people: chat apps and social sites fetch a link
 * the moment it is pasted, to draw its card, so those requests are redirected but never counted.
 */

const PREVIEWS = new RegExp(
  [
    "whatsapp",
    "slack", // Slackbot, Slack-ImgProxy
    "linkedin", // LinkedInBot
    "discord", // Discordbot
    "telegram", // TelegramBot
    "twitter", // Twitterbot
    "facebook", // facebookexternalhit, facebookcatalog
    "meta-external",
    "upwork",
    "skypeuripreview",
    "microsoft preview",
    "embedly",
    "iframely",
    "pinterest",
    "redditbot",
    "applebot",
    "google-pagerenderer",
    "headlesschrome",
    "preview",
    "(?<!cu)bot\\b", // not the CUBOT phone brand
    "bot/",
    "crawl",
    "spider",
    "slurp",
    "fetch",
    "curl/",
    "wget/",
    "python-",
    "axios/",
    "node-fetch",
    "undici",
    "go-http-client",
    "okhttp",
    "java/",
    "libwww",
  ].join("|"),
  "i",
);

export function isPreview(request: Request) {
  if (request.method !== "GET") return true;
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || PREVIEWS.test(ua)) return true;
  // Prefetches by browsers and link-unfurling proxies are not visits either.
  const purpose = request.headers.get("sec-purpose") ?? request.headers.get("purpose") ?? "";
  if (/prefetch|preview/i.test(purpose)) return true;
  return userAgent(request).isBot;
}

function device(request: Request): Device {
  const type = userAgent(request).device.type;
  if (type === "mobile" || type === "wearable") return "mobile";
  if (type === "tablet") return "tablet";
  return "desktop";
}

/** The referrer's host only: paths can carry private details, and the host says enough. */
function referrerHost(request: Request) {
  const referrer = request.headers.get("referer");
  if (!referrer) return undefined;
  try {
    return new URL(referrer).host || undefined;
  } catch {
    return undefined;
  }
}

export function describeClick(request: Request): Click {
  const country = request.headers.get("x-vercel-ip-country") ?? undefined;
  return { at: new Date().toISOString(), country, referrer: referrerHost(request), device: device(request) };
}

/** A tailored link's CV or portfolio PDF was fetched: on to the feed and the phone, unless a bot fetched it. */
export async function reportDownload(request: Request, row: { code: string; label: string }, kind: "cv" | "portfolio") {
  if (isPreview(request)) return;
  const { at, country, device } = describeClick(request);
  await report({ kind, ref: `cv:${row.code}`, name: row.label, at, country, device, ...visitFrom(request) });
}
