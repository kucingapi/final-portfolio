"use client";

import { Activity, ArrowUpRight, Briefcase, FolderOpen, Inbox as InboxIcon, Link2, PenLine, Plus, RefreshCw, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { ProjectExport } from "@/lib/dashboard/export";
import { ActivityView } from "./Activity";
import { ContentView } from "./Content";
import { DashboardData, useDashboard } from "./data";
import { InboxView, useUnread } from "./Inbox";
import { JobsView } from "./Jobs";
import { LinkSheet } from "./LinkSheet";
import { LinksView } from "./Links";
import { Mark } from "./Mark";
import { Projects } from "./Projects";
import { SettingsView } from "./Settings";
import { Button } from "./ui/button";
import { cn } from "./ui/cn";

const VIEWS = [
  { id: "activity", label: "Activity", icon: Activity },
  { id: "inbox", label: "Inbox", icon: InboxIcon },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "links", label: "Links", icon: Link2 },
  { id: "content", label: "Content", icon: PenLine },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "settings", label: "Settings", icon: SettingsIcon },
] as const;
export type View = (typeof VIEWS)[number]["id"];
/** On a phone these sit in the header rather than the tab bar, which keeps five tabs. */
const HEADER_ON_PHONE: View[] = ["projects", "settings"];

/**
 * The signed-in dashboard: a sidebar on a desktop, a tab bar on a phone. The view and any open link live
 * in the address (`?view=links&link=go:upwork`), so a notification can open straight onto a link and the
 * back button closes what's open.
 */
export function App({ origin, inbox, projects }: { origin: string; inbox: string; projects: ProjectExport[] }) {
  return (
    <DashboardData origin={origin} inbox={inbox}>
      <Shell projects={projects} />
    </DashboardData>
  );
}

function Shell({ projects }: { projects: ProjectExport[] }) {
  const params = useSearchParams();
  const view = (VIEWS.find((v) => v.id === params.get("view"))?.id ?? "activity") as View;
  const open = params.get("link");
  const enquiry = params.get("enquiry");
  const job = params.get("job");
  const pushed = useRef(false);

  // Opening the app counts as a visit: the session gets a fresh week, or shows sign-in if it lapsed.
  useEffect(() => {
    fetch("/api/dashboard/session")
      .then((r) => r.json())
      .then((r) => !r.signedIn && location.reload())
      .catch(() => {});
    const onPop = () => {
      pushed.current = false;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const write = (change: (p: URLSearchParams) => void, push = false) => {
    const p = new URLSearchParams(window.location.search);
    change(p);
    const url = `${window.location.pathname}${p.size ? `?${p}` : ""}`;
    if (push) window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
    pushed.current = push || pushed.current;
  };

  const show = (id: View) =>
    write((p) => {
      p.delete("link");
      p.delete("enquiry");
      p.delete("job");
      if (id === "activity") p.delete("view");
      else p.set("view", id);
    });
  // A message in the feed opens in the Inbox; everything else is a link.
  const openLink = (ref: string) =>
    ref.startsWith("enquiry:")
      ? write((p) => {
          p.set("view", "inbox");
          p.delete("link");
          p.set("enquiry", ref.slice("enquiry:".length));
        }, true)
      : write((p) => p.set("link", ref), !open);
  const close = (param: "link" | "enquiry" | "job") => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else write((p) => p.delete(param));
  };
  const closeLink = () => close("link");
  const openEnquiry = (id: string) => write((p) => p.set("enquiry", id), !enquiry);
  const openJob = (target: string) => write((p) => p.set("job", target), !job);

  const current = VIEWS.find((v) => v.id === view)!;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_minmax(0,1fr)]">
      <Sidebar view={view} onShow={show} />
      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-4 md:h-16 md:px-8">
            <h1 className="text-lg font-semibold tracking-[-0.01em] text-foreground md:text-xl">{current.label}</h1>
            <div className="ml-auto flex items-center gap-1">
              <Actions view={view} onNew={() => (view === "jobs" ? openJob("new") : openLink("new"))} />
              {VIEWS.filter((v) => HEADER_ON_PHONE.includes(v.id) && v.id !== view).map(({ id, label, icon: Icon }) => (
                <Button key={id} variant="ghost" size="icon" onClick={() => show(id)} aria-label={label} className="md:hidden">
                  <Icon className="size-[1.125rem]" />
                </Button>
              ))}
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] md:px-8 md:pt-7 md:pb-16">
          {view === "activity" && <ActivityView onOpen={openLink} onShow={show} />}
          {view === "inbox" && <InboxView open={enquiry} onOpen={openEnquiry} onClose={() => close("enquiry")} />}
          {view === "jobs" && <JobsView open={job} onOpen={openJob} onClose={() => close("job")} />}
          {view === "links" && <LinksView onOpen={openLink} />}
          {view === "content" && <ContentView />}
          {view === "projects" && <Projects projects={projects} />}
          {view === "settings" && <SettingsView />}
        </main>
      </div>
      <TabBar view={view} onShow={show} />
      <LinkSheet open={open} onOpen={openLink} onClose={closeLink} />
    </div>
  );
}

function Actions({ view, onNew }: { view: View; onNew: () => void }) {
  const { links, activity, enquiries, jobs } = useDashboard();
  if (view !== "activity" && view !== "links" && view !== "inbox" && view !== "jobs") return null;
  const source = view === "activity" ? activity : view === "inbox" ? enquiries : view === "jobs" ? jobs : links;
  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => source.reload()} disabled={source.loading} aria-label="Refresh">
        <RefreshCw className={cn("size-[1.125rem]", source.loading && "animate-spin")} />
      </Button>
      {(view === "links" || view === "jobs") && (
        <Button onClick={onNew} className="max-md:size-10 max-md:px-0">
          <Plus className="size-5" />
          <span className="max-md:sr-only">{view === "jobs" ? "New job" : "New link"}</span>
        </Button>
      )}
    </>
  );
}

/** The unread count beside Inbox, in the sidebar and the tab bar. */
function Badge({ className }: { className?: string }) {
  const unread = useUnread();
  if (!unread) return null;
  return (
    <span className={cn("grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[0.6875rem] font-semibold text-primary-foreground tabular-nums", className)}>
      {unread > 99 ? "99+" : unread}
      <span className="sr-only"> new</span>
    </span>
  );
}

function Sidebar({ view, onShow }: { view: View; onShow: (v: View) => void }) {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-card px-3 py-6 md:flex">
      <div className="flex items-center gap-3 px-3 pb-8">
        <Mark />
        <span className="font-semibold text-foreground">Dashboard</span>
      </div>
      <nav aria-label="Dashboard">
        <ul className="flex flex-col gap-1">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onShow(id)}
                aria-current={view === id ? "page" : undefined}
                className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-foreground"
              >
                <Icon className="size-[1.125rem]" />
                {label}
                {id === "inbox" && <Badge className="ml-auto" />}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <Link
        href="/"
        className="mt-auto flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
      >
        <ArrowUpRight className="size-[1.125rem]" />
        View the site
      </Link>
    </aside>
  );
}

function TabBar({ view, onShow }: { view: View; onShow: (v: View) => void }) {
  return (
    <nav aria-label="Dashboard" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-5">
        {VIEWS.filter((v) => !HEADER_ON_PHONE.includes(v.id)).map(({ id, label, icon: Icon }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onShow(id)}
              aria-current={view === id ? "page" : undefined}
              className="group flex h-16 w-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-muted-foreground/75 transition-colors duration-150 aria-[current=page]:text-foreground"
            >
              <span className="relative grid h-7 w-14 place-items-center rounded-full transition-colors duration-150 group-aria-[current=page]:bg-primary/18 group-aria-[current=page]:text-primary">
                <Icon className="size-[1.25rem]" />
                {id === "inbox" && <Badge className="absolute -top-1.5 right-1.5" />}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
