"use client";

import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Mark } from "./Mark";
import { Button } from "./ui/button";
import { Input, Label } from "./ui/input";

/** The screen around sign-in and setup: the mark, a title, one task. */
export function AuthScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-5 pt-[calc(env(safe-area-inset-top)+2.5rem)] pb-[calc(env(safe-area-inset-bottom)+2.5rem)]">
      <div className="w-full max-w-sm">
        <Mark className="mb-10" />
        <h1 className="text-2xl font-semibold tracking-[-0.015em] text-foreground">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export const Lead = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted-foreground">{children}</p>
);

/** Six digits, big and centred; sends itself when the sixth is typed or pasted. */
export function CodeInput({
  id,
  value,
  onChange,
  onComplete,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
        onChange(digits);
        if (digits.length === 6) onComplete(digits);
      }}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="\d{6}"
      maxLength={6}
      placeholder="000000"
      disabled={disabled}
      autoFocus
      required
      className="h-14 pl-[calc(0.875rem+0.35em)] text-center text-2xl font-semibold tracking-[0.35em] tabular-nums placeholder:text-muted-foreground/30 md:text-2xl"
    />
  );
}

/** Asks the server to email a setup (or reset) link; says where it went. */
export function useLinkRequest() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  async function request() {
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/dashboard/setup-link", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "The link couldn't be sent. Try again in a minute.");
      setState("sent");
    } catch (e) {
      setError((e as Error).message);
      setState("idle");
    }
  }
  return { state, error, request };
}

export function SentNote({ inbox }: { inbox: string }) {
  return (
    <div role="status" className="mt-8 flex gap-3 rounded-xl border border-border bg-card p-4">
      <MailCheck className="mt-0.5 size-5 shrink-0 text-primary" />
      <p className="text-sm leading-relaxed text-foreground">
        Sent to {inbox}. Open the link from the email; it works once, for 15 minutes.
        <span className="mt-1 block text-muted-foreground">Not there? Check spam, or ask again in a minute.</span>
      </p>
    </div>
  );
}

const ErrorText = ({ children }: { children: React.ReactNode }) => (
  <p role="alert" className="text-sm leading-relaxed text-destructive">
    {children}
  </p>
);

export function SignIn({ inbox }: { inbox: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lost, setLost] = useState(false);
  const reset = useLinkRequest();

  // The session cookie is SameSite=Strict, so arriving from another site's link hides it from the first
  // load. A same-site request carries it: if this browser is in fact signed in, load the dashboard.
  useEffect(() => {
    fetch("/api/dashboard/session")
      .then((r) => r.json())
      .then((r) => r.signedIn && location.reload())
      .catch(() => {});
  }, []);

  async function submit(value = code) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      if (res.ok) return location.reload();
      setError((await res.json().catch(() => ({}))).error ?? "Sign-in failed. Try again.");
      setCode("");
    } catch {
      setError("Couldn't reach the site. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreen title="Sign in">
      <Lead>Enter the 6-digit code from your authenticator app.</Lead>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-8 flex flex-col gap-3"
      >
        <Label htmlFor="code" className="sr-only">
          Code
        </Label>
        <CodeInput id="code" value={code} onChange={setCode} onComplete={submit} disabled={busy} />
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" size="lg" disabled={busy || code.length !== 6}>
          {busy ? "Checking…" : "Sign in"}
        </Button>
      </form>

      {reset.state === "sent" ? (
        <SentNote inbox={inbox} />
      ) : lost ? (
        <div className="mt-8 flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <p className="text-sm leading-relaxed text-foreground">
            A reset link goes to {inbox}.
            <span className="mt-1 block text-muted-foreground">
              Finishing it replaces your authenticator code and signs out every device.
            </span>
          </p>
          {reset.error && <ErrorText>{reset.error}</ErrorText>}
          <div className="flex gap-2">
            <Button size="sm" onClick={reset.request} disabled={reset.state === "sending"}>
              {reset.state === "sending" ? "Sending…" : "Email me a reset link"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setLost(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="link" className="mt-8" onClick={() => setLost(true)}>
          Lost your phone?
        </Button>
      )}
    </AuthScreen>
  );
}

/** No sign-in yet: the first step is a setup link by email. */
export function SetupRequired({ inbox }: { inbox: string }) {
  const link = useLinkRequest();
  return (
    <AuthScreen title="Set up sign-in">
      <Lead>
        The dashboard signs in with a 6-digit code from an authenticator app, like Google Authenticator, 1Password or Apple
        Passwords. To set it up, get a one-time link by email.
      </Lead>
      {link.state === "sent" ? (
        <SentNote inbox={inbox} />
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" onClick={link.request} disabled={link.state === "sending"}>
            {link.state === "sending" ? "Sending…" : "Email me a setup link"}
          </Button>
          <p className="text-[0.8125rem] text-muted-foreground">It goes to {inbox}.</p>
          {link.error && <ErrorText>{link.error}</ErrorText>}
        </div>
      )}
    </AuthScreen>
  );
}
