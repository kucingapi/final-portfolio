import { after } from "next/server";
import { services, site } from "@/content/site";
import { report } from "@/lib/dashboard/activity";
import { saveEnquiry } from "@/lib/dashboard/enquiries";
import { describeClick } from "@/lib/dashboard/visitor";

/**
 * Contact form endpoint. Every message is saved for the dashboard's Inbox and pings the phone, and a
 * copy is emailed through Resend when RESEND_API_KEY is set (see .env.example). The form succeeds when
 * either works; only when neither does (no store and no email) does it answer an error, so the form
 * shows the "email me directly" fallback.
 */

type Payload = { service?: string; name?: string; email?: string; phone?: string; message?: string; company?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** true sent, false failed, null not set up. */
async function emailCopy(fields: { service: string; name: string; email: string; text: string }): Promise<boolean | null> {
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
        subject: `New ${fields.service} enquiry from ${fields.name}`,
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

  const emailed = await emailCopy({ service, name, email, text });
  if (emailed === null && process.env.NODE_ENV !== "production") console.info(`[contact] RESEND_API_KEY not set, so no email copy:\n${text}`);

  let saved = false;
  try {
    const { country, device } = describeClick(request);
    const row = await saveEnquiry({ service, name, email, phone: phone || undefined, message, country, device, emailed: emailed === true });
    saved = true;
    const detail = message ? `${service} · ${message.length > 120 ? `${message.slice(0, 117)}…` : message}` : service;
    after(() => report({ at: row.at, kind: "enquiry", ref: `enquiry:${row.id}`, name, detail, country, device }));
  } catch (e) {
    console.error("[contact] couldn't save the message", e);
  }

  if (saved || emailed) return Response.json({ ok: true, delivered: emailed === true });
  return Response.json(
    { error: emailed === null ? "The contact form isn’t set up yet." : "Couldn’t send your message right now." },
    { status: emailed === null ? 503 : 502 },
  );
}
