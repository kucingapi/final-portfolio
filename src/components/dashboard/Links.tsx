"use client";

import { useCallback, useEffect, useState } from "react";
import type { LinkActivity } from "@/lib/cv/store";
import type { Click, LinkStats, ShortLink } from "@/lib/dashboard/links";
import { ClicksChart } from "./ClicksChart";
import { CopyButton } from "./Copy";

type LinkRow = ShortLink & { stats: LinkStats };
type CvRow = { code: string; label: string; createdAt: string; updatedAt: string; activity: LinkActivity };
type Row = { kind: "go"; at: string; link: LinkRow } | { kind: "cv"; at: string; cv: CvRow };

const FILTERS = ["All", "Short links", "CV links"] as const;

const when = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "never";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) location.reload();
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status}).`);
  return body as T;
}

const input = "rounded-xs border border-midnight-900 bg-base-900 px-12 py-8 text-midnight-50 placeholder:text-placeholder";
const button = "rounded-xs bg-midnight-400 px-16 py-8 font-semibold text-midnight-950 disabled:opacity-50";
const quiet = "rounded-xs border border-midnight-900 px-16 py-8 hover:bg-midnight-900";

/** Short links and tailored CV links in one list, newest first. */
export function Links({ origin }: { origin: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ links: LinkRow[]; cv: CvRow[] }>("/api/dashboard/links");
      const all: Row[] = [
        ...data.links.map((link) => ({ kind: "go" as const, at: link.createdAt, link })),
        ...data.cv.map((cv) => ({ kind: "cv" as const, at: cv.createdAt, cv })),
      ];
      setRows(all.sort((a, b) => b.at.localeCompare(a.at)));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads once on mount
    load();
  }, [load]);

  const shown = rows?.filter((r) => filter === "All" || (filter === "Short links" ? r.kind === "go" : r.kind === "cv"));

  return (
    <div className="flex flex-col gap-24">
      <NewLink origin={origin} onCreated={(name) => load().then(() => setOpen(`go:${name}`))} />
      <div className="flex flex-wrap items-center gap-8">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`rounded-xs px-12 py-4 text-chip ${filter === f ? "bg-midnight-50 text-midnight-950" : "border border-midnight-900 hover:bg-midnight-900"}`}
          >
            {f}
          </button>
        ))}
        <button onClick={load} className="ml-auto text-chip text-midnight-200 underline">
          Refresh
        </button>
      </div>
      {error && <p className="text-[#ff9b9b]">{error}</p>}
      {!rows && !error && <p className="text-midnight-200">Loading…</p>}
      {shown && !shown.length && <p className="text-midnight-200">Nothing here yet.</p>}
      <ul className="flex flex-col gap-8">
        {shown?.map((row) => {
          const id = row.kind === "go" ? `go:${row.link.name}` : `cv:${row.cv.code}`;
          const isOpen = open === id;
          return (
            <li key={id} className="rounded-sm bg-base-900/60">
              <button
                onClick={() => setOpen(isOpen ? null : id)}
                aria-expanded={isOpen}
                className="grid w-full grid-cols-[1fr_auto] items-center gap-16 px-20 py-16 text-left hover:bg-base-900"
              >
                {row.kind === "go" ? <GoSummary link={row.link} /> : <CvSummary cv={row.cv} />}
              </button>
              {isOpen &&
                (row.kind === "go" ? (
                  <GoDetail
                    origin={origin}
                    link={row.link}
                    onChanged={load}
                    onDeleted={() => {
                      setOpen(null);
                      load();
                    }}
                  />
                ) : (
                  <CvDetail origin={origin} cv={row.cv} />
                ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-xs bg-midnight-900 px-8 py-2 text-chip text-midnight-100">{children}</span>;
}

function GoSummary({ link }: { link: LinkRow }) {
  return (
    <>
      <span className="flex min-w-0 flex-col gap-4">
        <span className="flex items-center gap-8">
          <Badge>Short</Badge>
          <span className="truncate font-semibold text-midnight-50">/go/{link.name}</span>
        </span>
        <span className="truncate text-chip text-midnight-200">
          {link.note ? `${link.note} · ` : ""}
          {link.url}
        </span>
      </span>
      <span className="flex flex-col items-end gap-4 text-right">
        <span className="font-semibold text-midnight-50">
          {link.stats.total} click{link.stats.total === 1 ? "" : "s"}
        </span>
        <span className="text-chip text-midnight-200">last {when(link.stats.lastClick)}</span>
      </span>
    </>
  );
}

function CvSummary({ cv }: { cv: CvRow }) {
  const a = cv.activity;
  return (
    <>
      <span className="flex min-w-0 flex-col gap-4">
        <span className="flex items-center gap-8">
          <Badge>CV</Badge>
          <span className="truncate font-semibold text-midnight-50">/?v={cv.code}</span>
        </span>
        <span className="truncate text-chip text-midnight-200">{cv.label}</span>
      </span>
      <span className="flex flex-col items-end gap-4 text-right">
        <span className="font-semibold text-midnight-50">
          {a.opens} open{a.opens === 1 ? "" : "s"}
        </span>
        <span className="text-chip text-midnight-200">
          {a.cv} CV · {a.portfolio} portfolio
        </span>
      </span>
    </>
  );
}

function NewLink({ origin, onCreated }: { origin: string; onCreated: (name: string) => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const link = await api<ShortLink>("/api/dashboard/links", { method: "POST", body: JSON.stringify({ name, url, note }) });
      setName("");
      setUrl("");
      setNote("");
      onCreated(link.name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-12 rounded-sm border border-midnight-900 p-20">
      <h2 className="font-semibold text-midnight-50">New short link</h2>
      <div className="grid grid-cols-[auto_1fr] items-center gap-12 max-md:grid-cols-1">
        <label htmlFor="go-name" className="text-chip text-midnight-200">
          {origin.replace(/^https?:\/\//, "")}/go/
        </label>
        <input
          id="go-name"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          placeholder="name (blank for a random code)"
          maxLength={64}
          className={input}
        />
        <label htmlFor="go-url" className="text-chip text-midnight-200">
          Goes to
        </label>
        <input
          id="go-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://… or /projects/agentflow"
          required
          className={input}
        />
        <label htmlFor="go-note" className="text-chip text-midnight-200">
          Note
        </label>
        <input id="go-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Private: who or where it's for" className={input} />
      </div>
      {error && <p className="text-[#ff9b9b]">{error}</p>}
      <button disabled={busy || !url} className={`${button} self-start`}>
        {busy ? "Creating…" : "Create link"}
      </button>
    </form>
  );
}

function GoDetail({ origin, link, onChanged, onDeleted }: { origin: string; link: LinkRow; onChanged: () => void; onDeleted: () => void }) {
  const full = `${origin}/go/${link.name}`;
  const [clicks, setClicks] = useState<Click[] | null>(null);
  const [url, setUrl] = useState(link.url);
  const [note, setNote] = useState(link.note);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ clicks: Click[] }>(`/api/dashboard/links/${link.name}`)
      .then((r) => setClicks(r.clicks))
      .catch((e) => setError(e.message));
  }, [link.name, link.stats.total]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/api/dashboard/links/${link.name}`, { method: "PATCH", body: JSON.stringify({ url, note }) });
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete /go/${link.name}? Anyone who has it will land on the home page instead, and its clicks are lost.`)) return;
    try {
      await api(`/api/dashboard/links/${link.name}`, { method: "DELETE" });
      onDeleted();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const changed = url !== link.url || note !== link.note;

  return (
    <div className="flex flex-col gap-24 border-t border-midnight-900 px-20 py-20">
      <div className="flex flex-wrap items-center gap-12">
        <code className="break-all text-midnight-50">{full}</code>
        <CopyButton text={full} />
      </div>
      <form onSubmit={save} className="grid grid-cols-[auto_1fr] items-center gap-12 max-md:grid-cols-1">
        <label htmlFor={`url-${link.name}`} className="text-chip text-midnight-200">
          Goes to
        </label>
        <input id={`url-${link.name}`} value={url} onChange={(e) => setUrl(e.target.value)} required className={input} />
        <label htmlFor={`note-${link.name}`} className="text-chip text-midnight-200">
          Note
        </label>
        <input id={`note-${link.name}`} value={note} onChange={(e) => setNote(e.target.value)} className={input} />
        <div className="col-span-full flex flex-wrap gap-8">
          <button disabled={busy || !changed} className={button}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={remove} className={`${quiet} text-[#ff9b9b]`}>
            Delete
          </button>
        </div>
      </form>
      {error && <p className="text-[#ff9b9b]">{error}</p>}
      <ClicksChart days={link.stats.days} />
      <ClickLog clicks={clicks} />
    </div>
  );
}

function ClickLog({ clicks }: { clicks: Click[] | null }) {
  if (!clicks) return <p className="text-chip text-midnight-200">Loading clicks…</p>;
  if (!clicks.length) return <p className="text-chip text-midnight-200">No clicks yet. Link previews and your own browser aren&apos;t counted.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-chip">
        <caption className="mb-8 text-left text-midnight-200">Most recent clicks ({clicks.length})</caption>
        <thead className="text-midnight-200">
          <tr>
            <th className="py-4 pr-16 font-normal">When</th>
            <th className="py-4 pr-16 font-normal">Country</th>
            <th className="py-4 pr-16 font-normal">From</th>
            <th className="py-4 font-normal">Device</th>
          </tr>
        </thead>
        <tbody className="text-midnight-50">
          {clicks.map((c, i) => (
            <tr key={`${c.at}-${i}`} className="border-t border-midnight-900">
              <td className="py-6 pr-16 whitespace-nowrap">{when(c.at)}</td>
              <td className="py-6 pr-16">{c.country ? countryName(c.country) : "Unknown"}</td>
              <td className="py-6 pr-16">{c.referrer ?? "Direct"}</td>
              <td className="py-6 capitalize">{c.device}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function CvDetail({ origin, cv }: { origin: string; cv: CvRow }) {
  const full = `${origin}/?v=${cv.code}`;
  const a = cv.activity;
  return (
    <div className="flex flex-col gap-12 border-t border-midnight-900 px-20 py-20 text-chip">
      <div className="flex flex-wrap items-center gap-12">
        <code className="break-all text-body text-midnight-50">{full}</code>
        <CopyButton text={full} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-16 gap-y-4">
        <dt className="text-midnight-200">Opens</dt>
        <dd>{a.opens}</dd>
        <dt className="text-midnight-200">First open</dt>
        <dd>{when(a.firstOpen)}</dd>
        <dt className="text-midnight-200">Last open</dt>
        <dd>{when(a.lastOpen)}</dd>
        <dt className="text-midnight-200">CV downloads</dt>
        <dd>{a.cv}</dd>
        <dt className="text-midnight-200">Portfolio downloads</dt>
        <dd>{a.portfolio}</dd>
        <dt className="text-midnight-200">Updated</dt>
        <dd>{when(cv.updatedAt)}</dd>
      </dl>
      <p className="text-midnight-200">Tailored links are made and edited through the novel-cv MCP.</p>
    </div>
  );
}
