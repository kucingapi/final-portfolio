import { services, site } from "@/content/site";
import { redis } from "@/lib/kv";

/**
 * Contact form endpoint.
 * Sends the enquiry through Resend's HTTP API when RESEND_API_KEY is set
 * (see .env.example). Without a key it logs the message in development and
 * answers 503 in production, so the form shows the "email me directly" fallback.
 */

type Payload = { service?: string; name?: string; email?: string; phone?: string; message?: string; company?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/**
 * Each message is an email sent with the site's Resend key, so a script could otherwise flood the inbox
 * and use up the sending quota. Counted in Upstash, per sender address and for the whole site; in
 * development without Upstash nothing is counted.
 */
const PER_SENDER = 5;
const SITE_WIDE = 60;
const WINDOW = 3600;

function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("x-real-ip")?.trim() || forwarded || "unknown";
}

async function overLimit(request: Request) {
  if (!redis) return false;
  try {
    const count = async (key: string) => {
      // The expiry goes on first (INCR keeps it), so no count can outlive its window.
      await redis!.set(key, 0, { nx: true, ex: WINDOW });
      return redis!.incr(key);
    };
    const [sender, all] = await Promise.all([count(`contact:rate:ip:${clientIp(request)}`), count("contact:rate:all")]);
    return sender > PER_SENDER || all > SITE_WIDE;
  } catch (error) {
    // Upstash being down must not lose a real enquiry.
    console.error("[contact] rate limit unavailable", error);
    return false;
  }
}

/** Header-bound text (the subject) on one line. */
const oneLine = (v: string) => v.replace(/[\r\n\u2028\u2029]+/g, " ");

export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
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
  const service = services.includes(body.service as (typeof services)[number]) ? body.service! : "Others";

  if (!name) return Response.json({ error: "Please tell me your name." }, { status: 422 });
  if (!EMAIL.test(email)) return Response.json({ error: "Please use a valid email address." }, { status: 422 });
  if (await overLimit(request)) {
    return Response.json({ error: "Too many messages from here in the last hour. Please try again later." }, { status: 429 });
  }

  const details = [`Service: ${service}`, `Name: ${name}`, `Email: ${email}`];
  if (phone) details.push(`Phone: ${phone}`);
  const text = `${details.join("\n")}\n\n${message || "(no message)"}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[contact] RESEND_API_KEY not set — message not sent:\n${text}`);
      return Response.json({ ok: true, delivered: false });
    }
    return Response.json({ error: "The contact form isn’t set up yet." }, { status: 503 });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL ?? "Portfolio <onboarding@resend.dev>",
      // The address in the code, not the editable copy, so an edit can't redirect enquiries.
      to: [process.env.CONTACT_TO_EMAIL ?? site.email],
      reply_to: email,
      subject: oneLine(`New ${service} enquiry from ${name}`),
      text,
    }),
  });

  if (!res.ok) {
    console.error("[contact] Resend error", res.status, await res.text().catch(() => ""));
    return Response.json({ error: "Couldn’t send your message right now." }, { status: 502 });
  }
  return Response.json({ ok: true, delivered: true });
}
