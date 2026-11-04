"use client";

import { CircleCheck, QrCode } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { CopyButton } from "./Copy";
import { isIOS, isStandalone } from "./device";
import { AuthScreen, CodeInput, Lead, SentNote, useLinkRequest } from "./SignIn";
import { Button } from "./ui/button";
import { Label } from "./ui/input";

type Secret = { key: string; uri: string; qr: string };
const never = () => () => {};

/**
 * The page an emailed setup link opens. Nothing secret is on it until "Continue" is tapped (mail
 * scanners open links but don't tap), then: add the key to an authenticator app, type its first code.
 */
export function SetupFlow({ token, reset, inbox }: { token: string | null; reset: boolean; inbox: string }) {
  const [secret, setSecret] = useState<Secret | null>(null);
  const [code, setCode] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState(false);

  if (!token) return <Expired inbox={inbox} />;

  async function post<T>(body: object): Promise<T> {
    const res = await fetch("/api/dashboard/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
    return data as T;
  }

  async function reveal() {
    setBusy(true);
    setError(null);
    try {
      setSecret(await post<Secret>({ token }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function finish(value = code) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await post({ token, code: value });
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Done reset={reset} />;

  if (!secret) {
    return (
      <AuthScreen title={reset ? "Replace your authenticator code" : "Set up sign-in"}>
        <Lead>
          {reset
            ? "You'll add a new entry to your authenticator app. Finishing replaces the old code and signs out every device."
            : "You'll add the dashboard to your authenticator app, then type the code it shows. It takes a minute."}
        </Lead>
        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" onClick={reveal} disabled={busy}>
            {busy ? "One moment…" : "Continue"}
          </Button>
          {error && <ErrorText>{error}</ErrorText>}
        </div>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Add it to your authenticator">
      <Lead>Google Authenticator, 1Password, Apple Passwords and Authy all work.</Lead>

      <ol className="mt-8 flex flex-col gap-8">
        <li className="flex flex-col gap-4">
          {/* A phone adds it straight to its app; a computer shows the code to scan with the phone. */}
          <Button asChild size="lg" className="md:hidden">
            <a href={secret.uri}>Add to authenticator app</a>
          </Button>
          <div className={qr ? "flex flex-col gap-3" : "flex flex-col gap-3 max-md:hidden"}>
            <div
              className="w-56 overflow-hidden rounded-xl bg-white p-2 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full"
              role="img"
              aria-label="QR code with the sign-in key"
              dangerouslySetInnerHTML={{ __html: secret.qr }}
            />
            <p className="text-sm text-muted-foreground">Scan it with the authenticator app on your phone.</p>
          </div>
          {!qr && (
            <Button variant="link" className="self-start md:hidden" onClick={() => setQr(true)}>
              <QrCode />
              Scanning from another device? Show the QR code
            </Button>
          )}
          <div className="flex flex-col gap-2">
            <span className="text-[0.8125rem] text-muted-foreground">Or type the key:</span>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted py-1.5 pr-1.5 pl-3.5">
              <code className="min-w-0 flex-1 font-mono text-sm break-all text-foreground select-all">{secret.key}</code>
              <CopyButton text={secret.key.replace(/ /g, "")} />
            </div>
          </div>
        </li>
        <li>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              finish();
            }}
            className="flex flex-col gap-3"
          >
            <Label htmlFor="first-code">Then type the code the app shows</Label>
            <CodeInput id="first-code" value={code} onChange={setCode} onComplete={finish} disabled={busy} />
            {error && <ErrorText>{error}</ErrorText>}
            <Button type="submit" size="lg" disabled={busy || code.length !== 6}>
              {busy ? "Checking…" : "Finish setup"}
            </Button>
          </form>
        </li>
      </ol>
    </AuthScreen>
  );
}

const ErrorText = ({ children }: { children: React.ReactNode }) => (
  <p role="alert" className="text-sm leading-relaxed text-destructive">
    {children}
  </p>
);

function Done({ reset }: { reset: boolean }) {
  const ios = useSyncExternalStore(never, () => isIOS() && !isStandalone(), () => false);
  return (
    <AuthScreen title={reset ? "Your new code works" : "You're signed in"}>
      <div className="mt-6 flex gap-3">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
          {reset ? "Every other device is signed out now. Sign them in again with the new code." : "This browser stays signed in for a week after your last visit."}
        </p>
      </div>
      {ios && (
        <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
          For notifications on this iPhone, put the dashboard on your Home Screen: tap Share, then Add to Home Screen. Open it
          from there and sign in once with a code.
        </p>
      )}
      <Button asChild size="lg" className="mt-8 w-full">
        <Link href="/dashboard">Open the dashboard</Link>
      </Button>
    </AuthScreen>
  );
}

function Expired({ inbox }: { inbox: string }) {
  const link = useLinkRequest();
  return (
    <AuthScreen title="This link doesn't work anymore">
      <Lead>Setup links work once, for 15 minutes. Ask for a new one and use the newest email.</Lead>
      {link.state === "sent" ? (
        <SentNote inbox={inbox} />
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" onClick={link.request} disabled={link.state === "sending"}>
            {link.state === "sending" ? "Sending…" : "Email me a new link"}
          </Button>
          {link.error && <ErrorText>{link.error}</ErrorText>}
        </div>
      )}
    </AuthScreen>
  );
}
