import { services, site } from "@/content/site";

/**
 * Contact form endpoint.
 * Sends the enquiry through Resend's HTTP API when RESEND_API_KEY is set
 * (see .env.example). Without a key it logs the message in development and
 * answers 503 in production, so the form shows the "email me directly" fallback.
 */

type Payload = { service?: string; name?: string; email?: string; phone?: string; message?: string; company?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: Request) {
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
      subject: `New ${service} enquiry from ${name}`,
      text,
    }),
  });

  if (!res.ok) {
    console.error("[contact] Resend error", res.status, await res.text().catch(() => ""));
    return Response.json({ error: "Couldn’t send your message right now." }, { status: 502 });
  }
  return Response.json({ ok: true, delivered: true });
}
