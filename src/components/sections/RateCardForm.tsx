"use client";

import { useRef, useState, type FormEvent } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { designUnit } from "@/lib/motion";
import { track } from "@/lib/analytics";
import { mailto } from "@/content/site";
import { useLang, useUi } from "@/lib/i18n/client";

type Status = { state: "idle" | "sending" | "error"; message?: string };

const FIELDS = [
  { name: "name", type: "text", autoComplete: "name", required: true },
  { name: "email", type: "email", autoComplete: "email", required: true },
  { name: "org", type: "text", autoComplete: "organization", required: false },
  { name: "event", type: "text", autoComplete: "off", required: false },
] as const;

const underline = "absolute inset-x-0 bottom-0 h-[calc(var(--s)*2)] bg-midnight-100";
const underlineFocus =
  "absolute inset-x-0 bottom-0 h-[calc(var(--s)*4)] origin-left scale-x-0 bg-midnight-400 transition-transform duration-500 ease-[var(--ease-out)] peer-focus:scale-x-100";

/**
 * The request form of the Rate card section: name and email, with the organisation, the event and a
 * message optional. It posts to /api/contact (topic "rate-card"), which saves it to the dashboard's
 * Inbox, and then swaps itself for a thank-you. `email` is the site's address, the fallback when sending fails.
 */
export function RateCardForm({ email }: { email: string }) {
  const t = useUi().rateRequest;
  const lang = useLang();
  const root = useRef<HTMLDivElement>(null);
  const thanks = useRef<HTMLHeadingElement>(null);
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [sent, setSent] = useState<{ name: string; email: string } | null>(null);

  // The thank-you rises in once the form has gone.
  useGSAP(
    () => {
      if (!sent) return;
      thanks.current?.focus({ preventScroll: true });
      if (prefersReducedMotion()) return;
      gsap.from(root.current!.querySelectorAll("[data-thanks]"), { y: 30 * designUnit(), autoAlpha: 0, duration: 0.7, stagger: 0.1, ease: "power3.out" });
    },
    { scope: root, dependencies: [sent] },
  );

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (status.state === "sending" || !form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, topic: "rate-card", lang }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(t.refused[res.status] ?? (Object.keys(t.refused).length ? t.failed : body.error) ?? t.failed);
      track("rate_card_requested", { lang, has_org: Boolean(data.org?.trim()) });
      const done = () => {
        setSent({ name: data.name.trim().split(" ")[0], email: data.email.trim() });
        setStatus({ state: "idle" });
      };
      if (prefersReducedMotion()) return done();
      gsap.to(form, { y: -20 * designUnit(), autoAlpha: 0, duration: 0.4, ease: "power2.in", onComplete: done });
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error && err.message ? err.message : t.failed });
    }
  }

  return (
    <div ref={root} aria-live="polite" className="min-w-0 flex-1">
      {sent ? (
        <div className="flex flex-col items-start gap-20">
          {/* The visitor's name and address: kept out of session recordings. */}
          <h3
            ref={thanks}
            tabIndex={-1}
            data-thanks
            data-ph-mask
            className="ph-no-capture text-h2 font-bold text-midnight-50 focus:outline-none max-md:text-h3"
          >
            {t.thanks(sent.name)}
          </h3>
          <p data-thanks data-ph-mask className="ph-no-capture max-w-720 text-h4 font-semibold text-midnight-100">
            {t.sent(sent.email)}
          </p>
          <button
            type="button"
            data-thanks
            onClick={() => setSent(null)}
            className="mt-16 inline-flex items-center rounded-full border-2 border-midnight-50 px-28 py-10 text-lead font-semibold text-midnight-50 transition-colors hover:bg-midnight-50 hover:text-midnight-950"
          >
            {t.another}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-32 max-md:gap-24">
          {FIELDS.map((f) => (
            <label key={f.name} data-field className="flex flex-col gap-12 max-md:gap-8">
              <span className="pl-3 text-lead font-semibold text-midnight-50">{t.fields[f.name].label}</span>
              <span className="relative block">
                <input
                  name={f.name}
                  type={f.type}
                  required={f.required}
                  autoComplete={f.autoComplete}
                  maxLength={f.name === "event" ? 300 : 200}
                  placeholder={t.fields[f.name].placeholder}
                  className="peer h-64 w-full bg-transparent pl-14 text-lead font-semibold text-midnight-50 placeholder:text-placeholder focus:outline-none max-md:h-56"
                />
                <span aria-hidden className={underline} />
                <span aria-hidden className={underlineFocus} />
              </span>
            </label>
          ))}
          <label data-field className="flex flex-col gap-12 max-md:gap-8">
            <span className="pl-3 text-lead font-semibold text-midnight-50">{t.fields.message.label}</span>
            <span className="relative block">
              <textarea
                name="message"
                rows={3}
                maxLength={5000}
                placeholder={t.fields.message.placeholder}
                data-lenis-prevent
                className="peer block min-h-96 w-full resize-none bg-transparent pl-14 text-lead font-semibold text-midnight-50 placeholder:text-placeholder focus:outline-none max-md:min-h-88"
              />
              <span aria-hidden className={underline} />
              <span aria-hidden className={underlineFocus} />
            </span>
          </label>
          {/* Honeypot for bots; hidden from people and assistive tech. */}
          <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
          {status.state === "error" && (
            <p role="alert" className="text-lead font-semibold text-midnight-200">
              {status.message} {t.orEmail}{" "}
              <a href={mailto(email)} className="underline">
                {email}
              </a>
              .
            </p>
          )}
          <div data-field>
            <button
              type="submit"
              data-magnetic="10"
              disabled={status.state === "sending"}
              className="inline-flex items-center rounded-full bg-midnight-500 px-36 py-14 text-lead font-semibold text-white transition-colors hover:bg-midnight-400 disabled:opacity-60"
            >
              {status.state === "sending" ? t.sending : t.submit}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
