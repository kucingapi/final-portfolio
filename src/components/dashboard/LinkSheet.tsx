"use client";

import { Share } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { Click, ShortLink } from "@/lib/dashboard/links";
import { KIND } from "./Activity";
import { send, useApi } from "./api";
import { ClicksChart } from "./ClicksChart";
import { CopyButton } from "./Copy";
import { type CvRow, type LinkRow, linkUrl, useDashboard } from "./data";
import { canShare, share } from "./device";
import { ago, bare, count, countryName, date } from "./format";
import { Button } from "./ui/button";
import { Confirm } from "./ui/confirm";
import { Field, Input } from "./ui/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Skeleton } from "./ui/skeleton";
import { toast } from "./ui/toaster";

/**
 * The panel for one link (`go:<name>` or `cv:<code>`), or for a new short link (`new`). It keeps
 * showing the last link while it slides away.
 */
export function LinkSheet({ open, onOpen, onClose }: { open: string | null; onOpen: (ref: string) => void; onClose: () => void }) {
  const [shown, setShown] = useState(open);
  if (open && open !== shown) setShown(open);
  return (
    <Sheet open={Boolean(open)} onOpenChange={(next) => !next && onClose()}>
      <SheetContent>{shown && <Panel key={shown} target={shown} onOpen={onOpen} onClose={onClose} />}</SheetContent>
    </Sheet>
  );
}

function Panel({ target, onOpen, onClose }: { target: string; onOpen: (ref: string) => void; onClose: () => void }) {
  const { links } = useDashboard();
  if (target === "new") return <NewLink onCreated={onOpen} />;
  if (!links.data) return <Loading />;
  const id = target.slice(3);
  const link = target.startsWith("go:") ? links.data.links.find((l) => l.name === id) : undefined;
  if (link) return <GoDetail link={link} onDeleted={onClose} />;
  const cv = target.startsWith("cv:") ? links.data.cv.find((c) => c.code === id) : undefined;
  if (cv) return <CvDetail cv={cv} />;
  return (
    <SheetHeader>
      <SheetTitle>This link is gone</SheetTitle>
      <SheetDescription>It was deleted, so there&apos;s nothing more to show.</SheetDescription>
    </SheetHeader>
  );
}

function Loading() {
  return (
    <>
      <SheetHeader>
        <SheetTitle className="sr-only">Loading the link</SheetTitle>
        <SheetDescription className="sr-only">One moment.</SheetDescription>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-1 h-4 w-56" />
      </SheetHeader>
      <SheetBody>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </SheetBody>
    </>
  );
}

const never = () => () => {};

/** The address, with copy, and share where the phone has a share sheet. */
function Address({ url, title }: { url: string; title: string }) {
  const sharable = useSyncExternalStore(never, canShare, () => false);
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-muted py-1.5 pr-1.5 pl-3.5">
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{bare(url)}</span>
      <CopyButton text={url} />
      {sharable && (
        <Button size="sm" variant="secondary" onClick={() => share(url, title)}>
          <Share />
          Share
        </Button>
      )}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground">{children}</h3>;
}

// --- Short link ---------------------------------------------------------------------------------------

function GoDetail({ link, onDeleted }: { link: LinkRow; onDeleted: () => void }) {
  const { origin, links } = useDashboard();
  const detail = useApi<{ clicks: Click[] }>(`/api/dashboard/links/${link.name}`);
  const [url, setUrl] = useState(link.url);
  const [note, setNote] = useState(link.note);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const changed = url !== link.url || note !== link.note;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await send(`/api/dashboard/links/${link.name}`, "PATCH", { url, note });
      await links.reload();
      toast.success("Saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await send(`/api/dashboard/links/${link.name}`, "DELETE");
      setConfirm(false);
      onDeleted();
      toast.success(`Deleted /go/${link.name}`);
      // After the panel has slid away, so it doesn't switch to "gone" on its way out.
      setTimeout(links.reload, 300);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>/go/{link.name}</SheetTitle>
        <SheetDescription>
          {count(link.stats.total, "click")} · {link.stats.lastClick ? `last ${ago(link.stats.lastClick)}` : "none yet"}
          {link.note && ` · ${link.note}`}
        </SheetDescription>
      </SheetHeader>
      <SheetBody>
        <Address url={linkUrl(origin, `go:${link.name}`)} title={link.note || `/go/${link.name}`} />
        <ClicksChart days={link.stats.days} />
        <section className="flex flex-col gap-3">
          <Heading>Recent clicks</Heading>
          <Clicks clicks={detail.data?.clicks} error={detail.error} />
        </section>
        <form onSubmit={save} className="flex flex-col gap-4">
          <Heading>Change it</Heading>
          <Field label="Goes to" htmlFor="edit-url" hint="Links already sent follow the new destination at once.">
            <Input id="edit-url" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" autoComplete="off" required />
          </Field>
          <Field label="Note" htmlFor="edit-note" hint="Private: who or where it's for.">
            <Input id="edit-note" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={saving || !changed} className="self-start">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
        <div className="border-t border-border pt-5">
          <Button variant="destructive" onClick={() => setConfirm(true)}>
            Delete link
          </Button>
        </div>
        <Confirm
          open={confirm}
          onOpenChange={setConfirm}
          title={`Delete /go/${link.name}?`}
          description="Anyone who opens it afterwards lands on the home page, and its clicks are gone for good."
          action={deleting ? "Deleting…" : "Delete"}
          busy={deleting}
          destructive
          onConfirm={remove}
        />
      </SheetBody>
    </>
  );
}

const CLICKS_SHOWN = 12;

function Clicks({ clicks, error }: { clicks?: Click[]; error: string | null }) {
  const [all, setAll] = useState(false);
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!clicks) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (!clicks.length) {
    return <p className="text-sm leading-relaxed text-muted-foreground">No clicks yet. Link previews and your own browser aren&apos;t counted.</p>;
  }
  return (
    <>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {(all ? clicks : clicks.slice(0, CLICKS_SHOWN)).map((c, i) => (
          <li key={`${c.at}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span className="min-w-0 truncate">
              <span className="text-foreground">{countryName(c.country) ?? "Somewhere"}</span>
              <span className="text-muted-foreground">
                {" "}
                · {c.device}
                {c.referrer ? ` · from ${c.referrer}` : ""}
              </span>
            </span>
            <time dateTime={c.at} className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {ago(c.at)}
            </time>
          </li>
        ))}
      </ul>
      {!all && clicks.length > CLICKS_SHOWN && (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setAll(true)}>
          Show all {clicks.length}
        </Button>
      )}
    </>
  );
}

function NewLink({ onCreated }: { onCreated: (ref: string) => void }) {
  const { origin, links } = useDashboard();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const link = await send<ShortLink>("/api/dashboard/links", "POST", { url, name, note });
      await links.reload();
      toast.success(`Created /go/${link.name}`);
      onCreated(`go:${link.name}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>New short link</SheetTitle>
        <SheetDescription>People&apos;s clicks are counted; link previews and your own browser aren&apos;t.</SheetDescription>
      </SheetHeader>
      <form onSubmit={create} className="contents">
        <SheetBody className="gap-5">
          <Field label="Goes to" htmlFor="new-url" hint="A full address, or a page on this site like /projects/agentflow.">
            <Input id="new-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" autoComplete="off" required />
          </Field>
          <Field label="Name" htmlFor="new-name" hint={`Becomes ${bare(origin)}/go/${name || "…"}. Leave it empty for a random code.`}>
            <div className="flex h-11 items-center rounded-lg border border-input bg-muted transition-colors duration-150 focus-within:border-primary">
              <span className="pl-3.5 text-base text-muted-foreground md:text-sm">/go/</span>
              <input
                id="new-name"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="upwork"
                maxLength={64}
                autoCapitalize="none"
                autoComplete="off"
                className="h-full min-w-0 flex-1 bg-transparent pr-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 md:text-sm"
              />
            </div>
          </Field>
          <Field label="Note" htmlFor="new-note" hint="Private: who or where it's for.">
            <Input id="new-note" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={busy || !url.trim()}>
            {busy ? "Creating…" : "Create link"}
          </Button>
        </SheetBody>
      </form>
    </>
  );
}

// --- Tailored CV link ---------------------------------------------------------------------------------

function CvDetail({ cv }: { cv: CvRow }) {
  const { origin, activity } = useDashboard();
  const a = cv.activity;
  const events = (activity.data?.events ?? []).filter((e) => e.ref === `cv:${cv.code}`).slice(0, 20);
  const facts = [
    { label: "Opens", value: String(a.opens) },
    { label: "Last opened", value: a.lastOpen ? ago(a.lastOpen) : "not yet" },
    { label: "CV downloads", value: String(a.cv) },
    { label: "Portfolio downloads", value: String(a.portfolio) },
  ];
  return (
    <>
      <SheetHeader>
        <SheetTitle>{cv.label}</SheetTitle>
        <SheetDescription>Tailored CV link, made {date(cv.createdAt)}</SheetDescription>
      </SheetHeader>
      <SheetBody>
        <Address url={linkUrl(origin, `cv:${cv.code}`, cv.lang)} title="CV" />
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
          {facts.map((f) => (
            <div key={f.label} className="flex flex-col gap-1 bg-popover px-4 py-3">
              <dt className="text-[0.8125rem] text-muted-foreground">{f.label}</dt>
              <dd className="text-base font-semibold text-foreground tabular-nums">{f.value}</dd>
            </div>
          ))}
        </dl>
        <section className="flex flex-col gap-3">
          <Heading>Recent activity</Heading>
          {events.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {events.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="text-foreground">{KIND[e.kind].label}</span>
                    <span className="text-muted-foreground">
                      {[countryName(e.country), e.device]
                        .filter(Boolean)
                        .map((part) => ` · ${part}`)
                        .join("")}
                    </span>
                  </span>
                  <time dateTime={e.at} className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {ago(e.at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Nothing in the feed for this link yet. Your own browser (with ?test=1) is never counted.
            </p>
          )}
        </section>
        <p className="text-[0.8125rem] leading-relaxed text-muted-foreground">
          Tailored links are made and changed through the novel-cv MCP.
        </p>
      </SheetBody>
    </>
  );
}
