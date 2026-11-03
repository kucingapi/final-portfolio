import { Suspense } from "react";
import type { Metadata } from "next";
import { SetupFlow } from "@/components/dashboard/Setup";
import { setupInbox, setupLink } from "@/lib/dashboard/setup";

// The address carries a one-time token: never send it on as a referrer.
export const metadata: Metadata = { title: "Set up sign-in", referrer: "no-referrer" };

/** Where an emailed setup (or reset) link lands. The link's token is checked; the secret comes later. */
export default function SetupPage({ searchParams }: PageProps<"/dashboard/setup">) {
  return (
    <Suspense fallback={null}>
      <Setup searchParams={searchParams} />
    </Suspense>
  );
}

async function Setup({ searchParams }: Pick<PageProps<"/dashboard/setup">, "searchParams">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const link = value ? await setupLink(value) : null;
  return <SetupFlow token={link ? value : null} reset={link?.reset ?? false} inbox={setupInbox()} />;
}
