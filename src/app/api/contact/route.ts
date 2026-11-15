import { after } from "next/server";
import { services, site } from "@/content/site";
import { createHash } from "node:crypto";
import { countWithin, redis } from "@/lib/kv";
import { clientIp, senderKey } from "@/lib/rate";
import { report } from "@/lib/dashboard/activity";
import { saveEnquiry } from "@/lib/dashboard/enquiries";
import { RATE_CARD } from "@/lib/dashboard/enquiry-types";
import { isLang } from "@/lib/i18n/lang";
import { describeClick } from "@/lib/dashboard/visitor";
import { visitFrom } from "@/lib/dashboard/posthog";

/**
 * Contact form endpoint. Every message is saved for the dashboard's Inbox and pings the phone, and a
 * copy is emailed through Resend when RESEND_API_KEY is set (see .env.example). The form succeeds when
 * either works; only when neither does (no store and no email) does it answer an error, so the form
 * shows the "email me directly" fallback.
 */

type Payload = {
  service?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  company?: string;
  /** "rate-card": a request for the rate card from the Speaker / Teacher section, with an organisation, an event and the language asked in. */
  topic?: string;
  org?: string;
  event?: string;
  lang?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Each message is saved to the Inbox, pings the phone and is emailed with the site's Resend key, so a
 * script could otherwise flood all three and use up the sending quota (which the dashboard's setup and
 * recovery links share). Counted in
 * Upstash; in development without Upstash nothing is counted.
 *
 * Per sender (an IPv4 address, or an IPv6 /64, see senderKey) by the hour and by the day, and per reply
 * address, so a few addresses can't take the site-wide allowance between them. Then for the whole site:
 * by the hour, set high enough that closing the form takes many machines, and by the day, below
 * Resend's free 100 a day, so contact mail alone can't spend the quota and leave the dashboard's links
 * undelivered. CONTACT_DAILY_CAP raises that on a paid Resend plan.
 */
const HOUR = 3600;
const DAY = 86400;
const PER_SENDER = 5;
const PER_SENDER_DAY = 10;
const PER_ADDRESS = 5;
const SITE_WIDE = 120;
const SITE_WIDE_DAY = Number(process.env.CONTACT_DAILY_CAP) > 0 ? Number(process.env.CONTACT_DAILY_CAP) : 80;

const BUSY = "Too many messages right now. Please try again later, or email me directly.";

/** The reason to refuse this message, or null to send it. */
async function overLimit(request: Request, email: string): Promise<string | null> {
  if (!redis) return null;
  try {
    const count = async (key: string, seconds: number) => (await countWithin(redis!, key, seconds)).count;
    const sender = senderKey(clientIp(request));
    // A sender over their own limit doesn't count toward the site's, or one script could use up the
    // whole allowance and close the form for everyone else. The reply address is kept as a hash.
    if ((await count(`contact:rate:ip:${sender}`, HOUR)) > PER_SENDER) return "Too many messages from here in the last hour. Please try again later.";
    if ((await count(`contact:rate:ip-day:${sender}`, DAY)) > PER_SENDER_DAY) return "Too many messages from here today. Please try again tomorrow.";
    const address = createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 32);
    if ((await count(`contact:rate:email:${address}`, HOUR)) > PER_ADDRESS) return "Too many messages from this address in the last hour. Please try again later.";
    if ((await count("contact:rate:all", HOUR)) > SITE_WIDE) return BUSY;
    return (await count("contact:rate:day", DAY)) > SITE_WIDE_DAY ? BUSY : null;
  } catch (error) {
    // Upstash being down must not lose a real enquiry.
    console.error("[contact] rate limit unavailable", error);
    return null;
  }
}

/** Header-bound text (the subject) on one line. */
const oneLine = (v: string) => v.replace(/[\r\n\u2028\u2029]+/g, " ");

/** true sent, false failed, null not set up. */
async function emailCopy(fields: { service: string; subject: string; name: string; email: string; text: string }): Promise<boolean | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL ?? "Portfolio <onboarding@resend.dev>",
        // The address in the code, not the editable copy, so an edit can't redirect enquiries.
        to: [process.env.CONTACT_TO_EMAIL ?? site.email],
        reply_to: fields.email,
        subject: oneLine(fields.subject),
        text: fields.text,
      }),
    });
    if (res.ok) return true;
    console.error("[contact] Resend error", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("[contact] Resend error", e);
  }
  return false;
}

export async function POST(request: Request) {
  // Only this site's own form: a browser says where a request came from (no header: curl, older browsers).
  const from = request.headers.get("sec-fetch-site");
  if (from === "cross-site" || from === "same-site") {
    return Response.json({ error: "Please use the form on this site." }, { status: 403 });
  }
  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot filled in: pretend success so bots don't retry.
  if (clip(body.company, 200)) return Response.json({ ok: true });

  const name = clip(body.name, 120);
  const email = clip(body.email, 200);
  const phone = clip(body.phone, 40);
  const message = clip(body.message, 5000);
  const rateCard = body.topic === "rate-card";
  const org = rateCard ? clip(body.org, 160) : "";
  const event = rateCard ? clip(body.event, 300) : "";
  const lang = rateCard && isLang(body.lang) ? body.lang : undefined;
  const service = rateCard ? RATE_CARD : services.includes(body.service as (typeof services)[number]) ? body.service! : "Others";

  if (!name) return Response.json({ error: "Please tell me your name." }, { status: 422 });
  if (!EMAIL.test(email)) return Response.json({ error: "Please use a valid email address." }, { status: 422 });
  const limited = await overLimit(request, email);
  if (limited) return Response.json({ error: limited }, { status: 429 });

  const details = [`Service: ${service}`, `Name: ${name}`, `Email: ${email}`];
  if (phone) details.push(`Phone: ${phone}`);
  if (org) details.push(`Organisation: ${org}`);
  if (event) details.push(`Event: ${event}`);
  if (lang) details.push(`Language: ${lang === "id" ? "Bahasa Indonesia" : "English"}`);
  const text = `${details.join("\n")}\n\n${message || "(no message)"}`;

  const subject = rateCard ? `Rate card request from ${name}${org ? ` (${org})` : ""}` : `New ${service} enquiry from ${name}`;
  const emailed = await emailCopy({ service, subject, name, email, text });
  if (emailed === null && process.env.NODE_ENV !== "production") console.info(`[contact] RESEND_API_KEY not set, so no email copy:\n${text}`);

  let saved = false;
  try {
    const { country, device } = describeClick(request);
    const visit = visitFrom(request);
    const row = await saveEnquiry({ service, name, email, phone: phone || undefined, message, org: org || undefined, event: event || undefined, lang, country, device, emailed: emailed === true });
    saved = true;
    const first = message || event;
    const label = rateCard ? `Rate card request${org ? ` · ${org}` : ""}` : service;
    const detail = first ? `${label} · ${first.length > 120 ? `${first.slice(0, 117)}…` : first}` : label;
    after(() => report({ at: row.at, kind: "enquiry", ref: `enquiry:${row.id}`, name, detail, country, device, ...visit }));
  } catch (e) {
    console.error("[contact] couldn't save the message", e);
  }

  if (saved || emailed) return Response.json({ ok: true, delivered: emailed === true });
  return Response.json(
    { error: emailed === null ? "The contact form isn’t set up yet." : "Couldn’t send your message right now." },
    { status: emailed === null ? 503 : 502 },
  );
}
