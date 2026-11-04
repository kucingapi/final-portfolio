"use client";

import { ChevronRight, ExternalLink, History, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  discardContent,
  loadContent,
  publishContent,
  restoreContent,
  saveContent,
  type ContentResult,
  type ContentView as Loaded,
} from "@/app/dashboard/content-actions";
import { CONTENT_DOCS, type DocId } from "@/lib/content/schema";
import { Editor } from "./content/Editor";
import { ago, clock, count, date } from "./format";
import { Button } from "./ui/button";
import { cn } from "./ui/cn";
import { Confirm } from "./ui/confirm";
import { Skeleton } from "./ui/skeleton";
import { toast } from "./ui/toaster";

/**
 * The site's content, editable: projects, the master CV and the site's copy. Edits save as a draft that
 * only you see; Publish puts it on the site. Agents (over MCP) can only write drafts, so their changes
 * wait here for you to review and publish.
 */

const ORDER: DocId[] = ["projects", "cv", "site"];
/** Where to look at a draft on the site. */
const PREVIEW: Record<DocId, string> = { projects: "/projects", cv: "/cv", site: "/" };

type Busy = "load" | "save" | "publish" | "discard" | "restore" | null;

export function ContentView() {
  const [doc, setDoc] = useState<DocId>("projects");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [value, setValue] = useState<unknown>(null);
  const [dirty, setDirty] = useState(false);
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Busy>("load");
  const [stale, setStale] = useState(false);
  const [asking, setAsking] = useState<null | "discard" | { restore: number }>(null);
  const [reloads, setReloads] = useState(0);
  // Bumped when the editor should start fresh (another document, a restore), not on a save.
  const [generation, setGeneration] = useState(0);

  const show = useCallback((view: Loaded, fresh: boolean) => {
    setLoaded(view);
    setValue(view.state.value);
    setDirty(false);
    setIssues({});
    setStale(false);
    if (fresh) setGeneration((g) => g + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    loadContent(doc).then((result) => {
      if (!alive) return;
      setBusy(null);
      if (result.ok) show(result.view, true);
      else toast.error(result.error);
    });
    return () => {
      alive = false;
    };
  }, [doc, reloads, show]);

  const reload = () => {
    setBusy("load");
    setReloads((n) => n + 1);
  };

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const pick = (id: DocId) => {
    if (id === doc) return;
    if (dirty && !window.confirm("Leave without saving? Your unsaved changes here will be lost.")) return;
    setLoaded(null);
    setBusy("load");
    setDoc(id);
  };

  /** Apply a result; on failure keep what's typed and say why. `fresh` restarts the editor. */
  const handle = (result: ContentResult, done: string, fresh = false) => {
    if (result.ok) {
      show(result.view, fresh);
      toast.success(done);
      return true;
    }
    if (result.issues?.length) setIssues(Object.fromEntries(result.issues.map((i) => [i.path, i.message])));
    if (result.view) setStale(true);
    toast.error(result.error);
    return false;
  };

  const save = async () => {
    if (!loaded) return null;
    setBusy("save");
    const result = await saveContent(doc, value, loaded.state.rev);
    setBusy(null);
    return handle(result, "Saved as a draft.") ? result : null;
  };

  const publish = async () => {
    if (!loaded) return;
    let rev = loaded.state.rev;
    if (dirty) {
      const saved = await save();
      if (!saved || !saved.ok) return;
      if (!saved.view.state.draft) return; // Saving made it match the live copy: nothing to publish.
      rev = saved.view.state.rev;
    }
    setBusy("publish");
    const result = await publishContent(doc, rev);
    setBusy(null);
    handle(result, "Published. The site shows it from the next visit.");
  };

  const discard = async () => {
    setBusy("discard");
    const result = await discardContent(doc);
    setBusy(null);
    setAsking(null);
    handle(result, "Draft thrown away.", true);
  };

  const restore = async (version: number) => {
    if (!loaded) return;
    setBusy("restore");
    const result = await restoreContent(doc, version, loaded.state.rev);
    setBusy(null);
    setAsking(null);
    handle(result, "That version is now the draft. Publish it to put it back on the site.", true);
  };

  const state = loaded?.state;
  const issueCount = Object.keys(issues).length;

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label="Content" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => pick(id)}
            aria-pressed={id === doc}
            className="h-9 shrink-0 rounded-full border border-border px-4 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground aria-pressed:border-transparent aria-pressed:bg-foreground aria-pressed:text-background"
          >
            {CONTENT_DOCS[id].label}
          </button>
        ))}
      </div>

      {!loaded || !state ? (
        <LoadingCard />
      ) : (
        <>
          <Status
            loaded={loaded}
            doc={doc}
            dirty={dirty}
            busy={busy}
            stale={stale}
            onPublish={publish}
            onDiscard={() => setAsking("discard")}
            onReload={reload}
          />

          <Editor
            key={`${doc}-${generation}`}
            schema={CONTENT_DOCS[doc].schema}
            value={value}
            issues={issues}
            onChange={(update) => {
              setValue(update);
              setDirty(true);
            }}
          />

          <Versions loaded={loaded} busy={busy} onRestore={(rev) => (dirty ? setAsking({ restore: rev }) : restore(rev))} />

          {(dirty || issueCount > 0) && (
            <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 -mx-1 flex items-center gap-3 rounded-xl border border-border bg-popover p-3 pl-4 shadow-[0_12px_32px_rgb(0_0_0/0.4)] md:bottom-4">
              <p className={cn("min-w-0 flex-1 text-sm", issueCount ? "text-destructive" : "text-muted-foreground")}>
                {issueCount ? `${count(issueCount, "field")} to fix before it saves.` : "Unsaved changes"}
              </p>
              <Button onClick={save} disabled={busy !== null || !dirty}>
                {busy === "save" ? "Saving…" : "Save draft"}
              </Button>
            </div>
          )}
        </>
      )}

      <Confirm
        open={asking === "discard"}
        onOpenChange={(open) => !open && setAsking(null)}
        title="Throw the draft away?"
        description="The site keeps showing the published version. This can't be undone."
        action={busy === "discard" ? "Throwing away…" : "Throw away"}
        busy={busy === "discard"}
        destructive
        onConfirm={discard}
      />
      <Confirm
        open={typeof asking === "object" && asking !== null}
        onOpenChange={(open) => !open && setAsking(null)}
        title="Replace your unsaved changes?"
        description="That version becomes the draft, and what you've typed here since the last save is lost."
        action={busy === "restore" ? "Restoring…" : "Restore"}
        busy={busy === "restore"}
        onConfirm={() => typeof asking === "object" && asking && restore(asking.restore)}
      />
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
      <Skeleton className="h-14 rounded-xl" />
    </div>
  );
}

function Status({
  loaded,
  doc,
  dirty,
  busy,
  stale,
  onPublish,
  onDiscard,
  onReload,
}: {
  loaded: Loaded;
  doc: DocId;
  dirty: boolean;
  busy: Busy;
  stale: boolean;
  onPublish: () => void;
  onDiscard: () => void;
  onReload: () => void;
}) {
  const { state, changes } = loaded;
  const fromAgent = state.draft?.by === "agent";
  const [open, setOpen] = useState(fromAgent);
  const live = state.published.at ? `Live since ${date(state.published.at)}, ${clock(state.published.at)}` : "Live: the version that ships with the code";

  return (
    <section aria-label="Status" className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{live}</p>
      {state.draft ? (
        <p className="mt-1 font-semibold text-foreground">
          Draft from {ago(state.draft.at)}, {fromAgent ? "by an agent" : "by you"}
          <span className="font-normal text-muted-foreground"> · {count(changes.length, "change")}</span>
        </p>
      ) : (
        <p className="mt-1 font-semibold text-foreground">{dirty ? "Editing" : "No draft: what you see is live"}</p>
      )}

      {fromAgent && <p className="mt-2 text-[0.8125rem] leading-snug text-muted-foreground">An agent wrote this draft. Look over the changes before you publish.</p>}

      {stale && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-destructive/12 p-3 text-sm text-destructive">
          <span className="min-w-0 flex-1">Someone else changed this since you opened it.</span>
          <Button size="sm" variant="secondary" onClick={onReload}>
            Load theirs
          </Button>
        </div>
      )}

      {(state.draft || dirty) && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onPublish} disabled={busy !== null}>
            {busy === "publish" ? "Publishing…" : dirty ? "Save and publish" : "Publish"}
          </Button>
          {state.draft && (
            <Button asChild variant="secondary" aria-disabled={dirty}>
              <a href={`/api/dashboard/preview?path=${encodeURIComponent(PREVIEW[doc])}`} target="_blank" rel="noopener" onClick={(e) => dirty && e.preventDefault()}>
                <ExternalLink />
                Preview
              </a>
            </Button>
          )}
          {state.draft && (
            <Button variant="ghost" onClick={onDiscard} disabled={busy !== null}>
              Throw away draft
            </Button>
          )}
        </div>
      )}
      {dirty && state.draft && <p className="mt-2 text-[0.8125rem] text-muted-foreground">Preview shows the last saved draft.</p>}

      {changes.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ChevronRight className={cn("size-4 text-muted-foreground transition-transform duration-150", open && "rotate-90")} />
            What the draft changes
          </button>
          {open && (
            <ol className="mt-3 flex flex-col gap-3">
              {changes.map((c, i) => (
                <li key={`${c.path}-${i}`} className="text-[0.8125rem] leading-snug">
                  <p className="font-medium text-foreground">
                    <span className={cn("mr-1.5", c.kind === "removed" ? "text-destructive" : "text-primary")}>
                      {c.kind === "added" ? "Added" : c.kind === "removed" ? "Removed" : c.kind === "moved" ? "Moved" : "Changed"}
                    </span>
                    {c.where}
                  </p>
                  {c.before && c.kind !== "moved" && <p className="mt-0.5 text-muted-foreground line-through decoration-muted-foreground/50">{c.before}</p>}
                  {c.after && <p className="mt-0.5 text-foreground">{c.after}</p>}
                  {c.kind === "moved" && c.before && <p className="mt-0.5 text-muted-foreground">from {c.before}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}

function Versions({ loaded, busy, onRestore }: { loaded: Loaded; busy: Busy; onRestore: (rev: number) => void }) {
  const [open, setOpen] = useState(false);
  const { versions, state } = loaded;
  const rows = [...versions, { rev: 0, at: "", by: "dashboard" as const }];
  return (
    <section className="rounded-xl border border-border">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <History className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-sm font-medium text-foreground">Earlier versions</span>
        <ChevronRight className={cn("size-4 text-muted-foreground transition-transform duration-150", open && "rotate-90")} />
      </button>
      {open && (
        <ol className="border-t border-border">
          {rows.map((v) => {
            const current = v.rev === state.published.rev;
            return (
              <li key={v.rev} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block text-foreground">{v.rev ? `${date(v.at)}, ${clock(v.at)}` : "As it ships with the code"}</span>
                  <span className="block text-[0.8125rem] text-muted-foreground">{current ? "Live now" : v.rev ? (v.by === "agent" ? "Drafted by an agent" : "Published by you") : "The starting point"}</span>
                </span>
                {!current && (
                  <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => onRestore(v.rev)}>
                    <RotateCcw />
                    Restore
                  </Button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
