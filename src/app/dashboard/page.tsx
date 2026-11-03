import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { SESSION_COOKIE, totpSecret, validSession } from "@/lib/dashboard/auth";
import { allExports } from "@/lib/dashboard/export";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { SignIn } from "@/components/dashboard/SignIn";
import { onLocalhost, siteOrigin } from "./origin";

/**
 * Short links with their clicks, the tailored CV links, and each project ready for Upwork and Contra.
 * Behind an authenticator code; see src/lib/dashboard/auth.ts.
 */
export default function DashboardPage() {
  return (
    <div className="container-x">
      <Suspense fallback={<p className="text-body text-midnight-200">Loading…</p>}>
        <Gate />
      </Suspense>
    </div>
  );
}

async function Gate() {
  // Sessions expire, so this always runs per request.
  await connection();
  if (!totpSecret()) {
    return (
      <Notice title="Not set up yet">
        {(await onLocalhost()) ? (
          <>
            Set <code>DASHBOARD_TOTP_SECRET</code> first. <Link className="underline" href="/dashboard/setup">Open the setup page</Link>.
          </>
        ) : (
          <>The dashboard has no sign-in secret. Run the site on localhost and open /dashboard/setup.</>
        )}
      </Notice>
    );
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!validSession(token)) return <SignIn />;
  const origin = await siteOrigin();
  return <Dashboard origin={origin} projects={allExports(origin)} />;
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-640 text-body text-midnight-100">
      <h1 className="mb-16 text-h4 font-semibold text-midnight-50">{title}</h1>
      <p className="leading-[1.5]">{children}</p>
    </div>
  );
}
