import { Suspense } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { App } from "@/components/dashboard/App";
import { SetupRequired, SignIn } from "@/components/dashboard/SignIn";
import { SESSION_COOKIE, totpSecret, validSession } from "@/lib/dashboard/auth";
import { getProjects } from "@/lib/content/read";
import { projectExport } from "@/lib/dashboard/export";
import { setupInbox } from "@/lib/dashboard/setup";
import { siteOrigin } from "./origin";

/**
 * The latest clicks, opens and downloads, the short links and tailored CV links, each project ready for
 * Upwork and Contra, and notifications. Behind an authenticator code; see src/lib/dashboard/auth.ts.
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  // Sessions expire, so this always runs per request.
  await connection();
  const inbox = setupInbox();
  if (!(await totpSecret())) return <SetupRequired inbox={inbox} />;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await validSession(token))) return <SignIn inbox={inbox} />;
  const origin = await siteOrigin();
  return <App origin={origin} inbox={inbox} projects={(await getProjects()).map((p) => projectExport(p, origin))} />;
}
