"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProjectExport } from "@/lib/dashboard/export";
import { Links } from "./Links";
import { Projects } from "./Projects";

const TABS = ["Links", "Projects"] as const;

export function Dashboard({ origin, projects }: { origin: string; projects: ProjectExport[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Links");

  async function signOut() {
    await fetch("/api/dashboard/session", { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-32 text-body text-midnight-100">
      <div className="flex flex-wrap items-center justify-between gap-16">
        <h1 className="text-h4 font-semibold text-midnight-50">Dashboard</h1>
        <div className="flex items-center gap-8">
          <div role="tablist" className="flex gap-4 rounded-xs bg-base-900 p-4">
            {TABS.map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-xs px-16 py-8 ${tab === t ? "bg-midnight-400 font-semibold text-midnight-950" : "text-midnight-100 hover:bg-midnight-900"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <button onClick={signOut} className="rounded-xs border border-midnight-900 px-16 py-8 hover:bg-midnight-900">
            Sign out
          </button>
        </div>
      </div>
      {tab === "Links" ? <Links origin={origin} /> : <Projects projects={projects} />}
    </div>
  );
}
