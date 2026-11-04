"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { assembleHeadline, designUnit, magnetic } from "@/lib/motion";
import { track } from "@/lib/analytics";
import { onPageReveal, TransitionLink } from "@/components/transition/PageTransition";
import { ArrowIcon } from "@/components/ui";
import { ServiceArt } from "./ServiceArt";
import { mailto, services, type Service } from "@/content/site";

type Step = "service" | "details" | "sent";
type Status = { state: "idle" | "sending" | "error"; message?: string };

const FIELDS = [
  { name: "name", label: "What is your full name? *", placeholder: "Name", type: "text", autoComplete: "name", required: true },
  { name: "email", label: "What is your active/work email address? *", placeholder: "Email", type: "email", autoComplete: "email", required: true },
  { name: "phone", label: "What is your phone number? (optional)", placeholder: "Phone Number", type: "tel", autoComplete: "tel", required: false },
] as const;

/** Two-step contact flow: Figma "Chose Service" (281:3615) → "Information Detail" (281:3763). */
/** `email` is the site's address, shown as the fallback when the form can't send. */
export function ContactFlow({ email }: { email: string }) {
  const mailHref = mailto(email);
  const root = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("service");
  const [service, setService] = useState<Service | null>(null);
  const [sentName, setSentName] = useState("");
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [needService, setNeedService] = useState(false);
  const choices = useRef<HTMLDivElement>(null);

  // Intro for whichever step is mounted; re-runs on every step change.
  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const reduced = prefersReducedMotion();
      const tl = gsap.timeline({ paused: true });
      const title = q("[data-step-title]")[0];
      if (title) tl.add(assembleHeadline(title), 0);
      if (!reduced) {
        tl.from(q("[data-step-sub]"), { y: 30 * designUnit(), autoAlpha: 0, duration: 0.7 }, 0.3)
          // Explicit end values: the service cards also have a CSS opacity transition (for dimming the
          // unpicked ones), so a from() could read a mid-transition opacity and end up stuck hidden.
          // Clearing the inline styles afterwards hands opacity back to those classes.
          .fromTo(
            q("[data-pop]"),
            { scale: 0.7, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.7, stagger: 0.1, ease: "back.out(1.4)", clearProps: "all" },
            0.35,
          )
          .from(q("[data-field]"), { x: 60 * designUnit(), autoAlpha: 0, duration: 0.7, stagger: 0.08 }, 0.35)
          .from(q("[data-code-row]"), { scaleX: 0, transformOrigin: "left center", duration: 0.5, stagger: 0.03 }, 0.8);
      }
      const offs = q("[data-magnetic]").map((el) => magnetic(el as HTMLElement, 12));
      const off = onPageReveal(() => tl.play());
      return () => {
        off();
        offs.forEach((o) => o());
      };
    },
    { scope: root, dependencies: [step], revertOnUpdate: true },
  );

  function go(next: Step) {
    if (prefersReducedMotion()) return setStep(next);
    gsap.to(root.current!.querySelectorAll("[data-step]"), {
      x: (next === "service" ? 80 : -80) * designUnit(),
      autoAlpha: 0,
      duration: 0.4,
      ease: "power3.in",
      onComplete: () => {
        setStep(next);
        window.scrollTo({ top: 0 });
      },
    });
  }

  function next() {
    if (service) return go("details");
    setNeedService(true);
    if (!prefersReducedMotion()) {
      gsap.fromTo(choices.current, { x: 0 }, { keyframes: { x: [-12, 10, -6, 3, 0] }, duration: 0.45, ease: "none" });
    }
  }

  function choose(s: Service) {
    setService(s);
    setNeedService(false);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setStatus({ state: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, service }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      track("contact_submitted", { service });
      setSentName(data.name.split(" ")[0]);
      setStatus({ state: "idle" });
      go("sent");
    } catch (err) {
      setStatus({ state: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  return (
    <div ref={root} className="relative mx-auto min-h-svh w-1440 overflow-clip max-md:w-full">
      {step === "service" && (
        <div data-step className="relative h-1024 max-md:h-auto max-md:px-20 max-md:pt-100 max-md:pb-60">
          <h1 data-step-title className="absolute top-109 left-100 text-h1 font-bold text-midnight-50 [text-box:trim-both_cap_alphabetic] max-md:static">
            Service
          </h1>
          <p data-step-sub className="absolute top-187 left-106 text-h4 font-semibold text-midnight-50 max-md:static max-md:mt-16">
            Select a service that we are going to talk about
          </p>

          <div
            ref={choices}
            role="radiogroup"
            aria-label="Service"
            aria-describedby={needService ? "service-hint" : undefined}
            className="absolute top-327 left-99 flex w-1239 flex-col gap-39 max-md:static max-md:mt-32 max-md:w-full max-md:gap-16"
          >
            <div className="flex gap-39 max-md:flex-col max-md:items-center max-md:gap-16">
              {services
                .filter((s) => s !== "Others")
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={service === s}
                    data-pop
                    onClick={() => choose(s)}
                    className={`group relative size-387 shrink-0 overflow-hidden rounded-2xl bg-midnight-600 outline-offset-[calc(var(--s)*6)] transition-[translate,opacity] duration-300 hover:-translate-y-6 max-md:size-300 ${
                      service === s ? "outline-[calc(var(--s)*6)] outline-midnight-50 outline-solid" : ""
                    } ${service && service !== s ? "opacity-50" : ""}`}
                  >
                    <span className="absolute top-0 left-0 size-387 origin-top-left max-md:scale-[0.775]">
                      <span className="absolute inset-0 transition-transform duration-500 ease-[var(--ease-out)] group-hover:-rotate-3 group-hover:scale-[1.04]">
                        <ServiceArt service={s} />
                      </span>
                      <span className="absolute top-15 left-1/2 -translate-x-1/2 font-display text-[calc(var(--s)*100)] leading-[1.2] font-semibold tracking-[-0.005em] text-midnight-50">
                        {s}
                      </span>
                    </span>
                  </button>
                ))}
            </div>
            <button
              type="button"
              role="radio"
              aria-checked={service === "Others"}
              data-pop
              onClick={() => choose("Others")}
              className={`h-67 w-full rounded-2xl bg-midnight-600 font-display text-[calc(var(--s)*50)] leading-[1.2] font-semibold text-midnight-50 outline-offset-[calc(var(--s)*6)] transition-[background-color,opacity] duration-300 hover:bg-midnight-500 max-md:h-72 max-md:text-[calc(var(--s)*32)] ${
                service === "Others" ? "outline-[calc(var(--s)*6)] outline-midnight-50 outline-solid" : ""
              } ${service && service !== "Others" ? "opacity-50" : ""}`}
            >
              Others
            </button>
          </div>

          <div className="absolute top-880 right-100 flex flex-col items-end gap-12 max-md:static max-md:mt-32">
            <button
              type="button"
              data-pop
              data-magnetic
              onClick={next}
              aria-label="Next step"
              className="flex size-96 items-center justify-center rounded-[calc(var(--s)*24.67)] bg-midnight-500 transition-colors hover:bg-midnight-400"
            >
              <ArrowIcon className="size-72" />
            </button>
            <span
              id="service-hint"
              aria-live="polite"
              className={`font-display text-lead whitespace-nowrap transition-colors ${needService ? "text-midnight-50" : "text-midnight-100"}`}
            >
              {needService ? "Pick a service first" : "1 / 2"}
            </span>
          </div>
        </div>
      )}

      {step === "details" && (
        <div data-step className="relative min-h-1378 pb-120 max-md:min-h-0 max-md:px-20 max-md:pt-100 max-md:pb-60">
          <div className="absolute top-99 left-103 flex items-center gap-16 max-md:static">
            <button
              type="button"
              data-pop
              onClick={() => go("service")}
              aria-label="Back to service selection"
              className="flex size-48 items-center justify-center rounded-full bg-midnight-400 transition-transform hover:-translate-x-4"
            >
              <Image src="/figma/icons/arrow-right-small.svg" alt="" width={36} height={36} unoptimized className="size-36 rotate-180" />
            </button>
            <span data-step-sub className="font-display text-lead text-midnight-100">
              2 / 2 · {service}
            </span>
          </div>

          <h1 data-step-title className="absolute top-267 left-100 text-h1 font-bold text-midnight-50 [text-box:trim-both_cap_alphabetic] max-md:static max-md:mt-40">
            Final Step
          </h1>
          <p data-step-sub className="absolute top-345 left-100 text-h4 font-semibold text-midnight-50 max-md:static max-md:mt-16">
            Fill out your informations
          </p>

          <form
            onSubmit={submit}
            noValidate={false}
            className="absolute top-452 left-100 flex gap-46 max-md:static max-md:mt-32 max-md:flex-col max-md:gap-32"
          >
            <div className="flex w-708 flex-col gap-48 max-md:w-full max-md:gap-28">
              {FIELDS.map((f) => (
                <label key={f.name} data-field className="group flex flex-col gap-24 max-md:gap-8">
                  <span className="pl-3 text-lead font-semibold text-midnight-50">{f.label}</span>
                  <span className="relative block">
                    <input
                      name={f.name}
                      type={f.type}
                      required={f.required}
                      autoComplete={f.autoComplete}
                      placeholder={f.placeholder}
                      className="peer h-138 w-full bg-transparent pl-14 text-h2 font-semibold text-midnight-50 placeholder:text-placeholder focus:outline-none max-md:h-64"
                    />
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-[calc(var(--s)*2)] bg-midnight-100" />
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-[calc(var(--s)*4)] origin-left scale-x-0 bg-midnight-400 transition-transform duration-500 ease-[var(--ease-out)] peer-focus:scale-x-100"
                    />
                  </span>
                </label>
              ))}
              <label data-field className="flex flex-col gap-24 max-md:gap-8">
                <span className="pl-3 text-lead font-semibold text-midnight-50">What can I help you with?</span>
                <span className="relative block">
                  <textarea
                    name="message"
                    rows={3}
                    placeholder="Tell me about the project, role or problem you have in mind"
                    data-lenis-prevent
                    className="peer block min-h-162 w-full resize-none bg-transparent text-h4 font-semibold text-midnight-50 placeholder:text-placeholder focus:outline-none max-md:min-h-120"
                  />
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-[calc(var(--s)*2)] bg-midnight-100" />
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-[calc(var(--s)*4)] origin-left scale-x-0 bg-midnight-400 transition-transform duration-500 ease-[var(--ease-out)] peer-focus:scale-x-100"
                  />
                </span>
              </label>
              {/* Honeypot for bots; hidden from people and assistive tech. */}
              <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
              {status.state === "error" && (
                <p role="alert" className="text-lead font-semibold text-midnight-200">
                  {status.message} You can also email me at{" "}
                  <a href={mailHref} className="underline">
                    {email}
                  </a>
                  .
                </p>
              )}
            </div>

            <button
              type="submit"
              data-pop
              disabled={status.state === "sending"}
              aria-label="Send message"
              className="group flex w-476 items-center justify-center self-stretch overflow-hidden rounded-2xl bg-midnight-700 transition-colors hover:bg-midnight-500 disabled:opacity-60 max-md:h-120 max-md:w-full"
            >
              <Image
                src="/figma/icons/arrow-right-large.svg"
                alt=""
                width={262}
                height={262}
                unoptimized
                className={`size-262 transition-transform duration-500 ease-[var(--ease-out)] group-hover:translate-x-24 max-md:size-80 ${status.state === "sending" ? "animate-pulse" : ""}`}
              />
            </button>
          </form>
        </div>
      )}

      {step === "sent" && (
        <div data-step className="flex min-h-svh flex-col items-start justify-center px-100 py-160 max-md:px-20">
          <h1 data-step-title className="text-h1 font-bold text-midnight-50">
            Thanks{sentName ? `, ${sentName}` : ""}!
          </h1>
          <p data-step-sub className="mt-24 max-w-900 text-h4 font-semibold text-midnight-100">
            Your message is on its way. I’ll get back to you within a couple of days.
          </p>
          <TransitionLink
            href="/"
            data-pop
            data-magnetic
            className="mt-48 inline-flex items-center gap-16 rounded-full bg-midnight-500 py-16 pr-24 pl-32 text-h4 font-semibold text-white transition-colors hover:bg-midnight-400"
          >
            Back home <ArrowIcon className="size-48" />
          </TransitionLink>
        </div>
      )}
    </div>
  );
}
