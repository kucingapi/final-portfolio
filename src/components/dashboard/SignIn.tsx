"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** The authenticator code form. */
export function SignIn() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The session cookie is SameSite=Strict, so arriving from another site's link hides it from the first
  // load. A same-site request carries it: if this browser is in fact signed in, load the dashboard.
  useEffect(() => {
    fetch("/api/dashboard/session")
      .then((r) => r.json())
      .then((r) => r.signedIn && router.refresh())
      .catch(() => {});
  }, [router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) return router.refresh();
      setError((await res.json()).error ?? "Sign-in failed.");
      setCode("");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-420 flex-col gap-16 text-body text-midnight-100">
      <h1 className="text-h4 font-semibold text-midnight-50">Dashboard</h1>
      <label htmlFor="code">Code from your authenticator app</label>
      <input
        id="code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        autoFocus
        required
        className="rounded-xs border border-midnight-900 bg-base-900 px-16 py-12 font-mono text-lead tracking-[0.3em] text-midnight-50"
      />
      {error && (
        <p role="alert" className="text-[#ff9b9b]">
          {error}
        </p>
      )}
      <button
        disabled={busy || code.length !== 6}
        className="rounded-xs bg-midnight-400 px-16 py-12 font-semibold text-midnight-950 disabled:opacity-50"
      >
        {busy ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
