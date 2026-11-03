import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { site } from "@/content/site";
import { totpSecret } from "@/lib/dashboard/auth";
import { newSecret, otpauthUri } from "@/lib/dashboard/totp";
import { onLocalhost } from "../origin";

export const metadata: Metadata = { title: "Dashboard setup" };

/**
 * One-time setup: a new secret and its QR code, for an authenticator app. Only while no secret is set,
 * and only on localhost; anywhere else this page doesn't exist. Each load makes a new secret.
 */
export default function SetupPage() {
  return (
    <div className="container-x">
      <Suspense fallback={null}>
        <Setup />
      </Suspense>
    </div>
  );
}

async function Setup() {
  await connection();
  if (totpSecret() || !(await onLocalhost())) notFound();
  const secret = newSecret();
  const uri = otpauthUri(secret, site.email, `${site.name} dashboard`);
  const svg = await QRCode.toString(uri, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#010326", light: "#ffffff" } });
  const grouped = secret.match(/.{1,4}/g)!.join(" ");
  return (
    <div className="max-w-760 text-body leading-[1.5] text-midnight-100">
      <h1 className="mb-24 text-h4 font-semibold text-midnight-50">Set up dashboard sign-in</h1>
      <ol className="flex list-decimal flex-col gap-16 pl-24">
        <li>
          Scan this with Google Authenticator, 1Password or Authy.
          <div className="mt-12 w-240 overflow-hidden rounded-xs bg-white" dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="mt-8 text-midnight-200">
            Or type the key: <code className="font-mono text-midnight-50 select-all">{grouped}</code>
          </p>
        </li>
        <li>
          Add it to <code>.env.local</code>, and to the Vercel project&apos;s environment variables (Production), then
          restart the dev server and redeploy:
          <pre className="mt-12 overflow-x-auto rounded-xs bg-base-900 p-16 font-mono text-midnight-50 select-all">
            DASHBOARD_TOTP_SECRET={secret}
          </pre>
        </li>
        <li>
          Sign in at <code>/dashboard</code> with the app&apos;s 6-digit code. Reloading this page makes a different
          secret, so finish with this one first.
        </li>
      </ol>
      <p className="mt-32 text-midnight-200">
        Lost the phone? Make a new secret here (with the variable unset locally), put it in Vercel and redeploy. The
        old one stops working, and every signed-in device is signed out.
      </p>
    </div>
  );
}
