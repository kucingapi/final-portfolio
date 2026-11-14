"use client";

import { Inbox as InboxIcon, Mail, MessageCircle, Phone, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Enquiry } from "@/lib/dashboard/enquiries";
import type { SiteChat, SiteChatSummary } from "@/lib/dashboard/sitechat";
import { send, useApi } from "./api";
import { CopyButton } from "./Copy";
import { useDashboard } from "./data";
import { ago, clock, countryName, date } from "./format";
import { Problem } from "./Problem";
import type { SiteChatData } from "./Settings";
import { Button } from "./ui/button";
import { cn } from "./ui/cn";
import { Confirm } from "./ui/confirm";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "./ui/sheet";
import { Skeleton } from "./ui/skeleton";
import { toast } from "./ui/toaster";

/**
 * Messages from the contact form, newest first. Opening the Inbox marks what's in it as read, though
 * the messages that were new stay marked until you leave. A message opens in a panel with its sender,
 * a reply link and delete.
 */
export function InboxView({
  open,
  onOpen,
  onClose,
  chat,
  onOpenChat,
  onCloseChat,
}: {
  open: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
  chat: string | null;
  onOpenChat: (id: string) => void;
  onCloseChat: () => void;
}) {
  const [tab, setTab] = useState<"messages" | "chats">(chat ? "chats" : "messages");
  // A notification or the feed opening a site chat shows its tab.
  if (chat && tab !== "chats") setTab("chats");
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Inbox" className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {(
          [
            ["messages", "Messages"],
            ["chats", "Site chats"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className="h-9 rounded-lg text-sm font-medium text-muted-foreground transition-colors duration-150 aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-sm"
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "messages" ? <Messages open={open} onOpen={onOpen} onClose={onClose} /> : <SiteChats open={chat} onOpen={onOpenChat} onClose={onCloseChat} />}
    </div>
  );
}

function Messages({ open, onOpen, onClose }: { open: string | null; onOpen: (id: string) => void; onClose: () => void }) {
  const { enquiries } = useDashboard();
  const { reload } = enquiries;
  // What was new when the Inbox opened; marking it read below doesn't unmark these.
  const [since] = useState(() => enquiries.data?.seen ?? null);

  useEffect(() => {
    send("/api/dashboard/enquiries", "POST", { seen: true })
      .catch(() => {})
      .finally(reload);
  }, [reload]);

  const rows = enquiries.data?.enquiries;
  return (
    <>
      {enquiries.error && !rows ? (
        <Problem message={enquiries.error} onRetry={reload} />
      ) : !rows ? (
        <ListSkeleton />
      ) : rows.length ? (
        <ol className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          {rows.map((e) => (
            <Row key={e.id} e={e} unread={!since || e.at > since} onOpen={() => onOpen(e.id)} />
          ))}
        </ol>
      ) : (
        <Empty />
      )}
      <EnquirySheet open={open} rows={rows} onClose={onClose} onDeleted={reload} />
    </>
  );
}

function Row({ e, unread, onOpen }: { e: Enquiry; unread: boolean; onOpen: () => void }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <button type="button" onClick={onOpen} className="flex w-full gap-3 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-accent">
        <span aria-hidden className={cn("mt-2 size-2 shrink-0 rounded-full", unread ? "bg-primary" : "bg-transparent")} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={cn("min-w-0 flex-1 truncate text-[0.9375rem] text-foreground", unread ? "font-semibold" : "font-medium")}>
              {e.name}
              {unread && <span className="sr-only"> (new)</span>}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{ago(e.at)}</span>
          </span>
          <span className="mt-0.5 block text-[0.8125rem] text-muted-foreground">{e.service}</span>
          {e.message && <span className="mt-1 line-clamp-2 block text-sm leading-snug text-foreground/85">{e.message}</span>}
        </span>
      </button>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <InboxIcon className="size-6 text-muted-foreground" />
      <p className="font-semibold text-foreground">No messages yet</p>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
        When someone sends the contact form, the message lands here, and on your phone if notifications are on.
      </p>
    </div>
  );
}

function EnquirySheet({ open, rows, onClose, onDeleted }: { open: string | null; rows?: Enquiry[]; onClose: () => void; onDeleted: () => void }) {
  // Keep showing the message while the panel slides away.
  const [shown, setShown] = useState(open);
  if (open && open !== shown) setShown(open);
  const e = rows?.find((x) => x.id === shown);
  return (
    <Sheet open={Boolean(open)} onOpenChange={(next) => !next && onClose()}>
      <SheetContent>
        {e ? (
          <Detail key={e.id} e={e} onDeleted={() => (onClose(), onDeleted())} />
        ) : (
          <SheetHeader>
            <SheetTitle>{rows ? "This message is gone" : "Loading the message"}</SheetTitle>
            <SheetDescription>{rows ? "It was deleted, or it's older than the 500 kept." : "One moment."}</SheetDescription>
          </SheetHeader>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Detail({ e, onDeleted }: { e: Enquiry; onDeleted: () => void }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const subject = encodeURIComponent(`Re: your ${e.service.toLowerCase()} enquiry`);
  const when = `${date(e.at)}, ${clock(e.at)}`;
  const where = [e.country && countryName(e.country), e.device].filter(Boolean).join(" · ");

  const remove = async () => {
    setBusy(true);
    try {
      await send(`/api/dashboard/enquiries/${e.id}`, "DELETE");
      toast.success("Message deleted.");
      onDeleted();
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>{e.name}</SheetTitle>
        <SheetDescription>
          {e.service} · {when}
          {where && ` · ${where}`}
        </SheetDescription>
      </SheetHeader>
      <SheetBody>
        <p className="text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-foreground">
          {e.message || <span className="text-muted-foreground">No message, just the contact details.</span>}
        </p>

        <div className="flex flex-col overflow-hidden rounded-xl border border-border">
          <Contact icon={Mail} href={`mailto:${e.email}`} value={e.email} />
          {e.phone && <Contact icon={Phone} href={`tel:${e.phone.replace(/[^\d+]/g, "")}`} value={e.phone} />}
        </div>

        <Button asChild size="lg">
          <a href={`mailto:${e.email}?subject=${subject}`}>
            <Mail />
            Reply by email
          </a>
        </Button>

        <p className="text-[0.8125rem] leading-snug text-muted-foreground">
          {e.emailed ? "A copy also went to your email." : "No copy went to your email (it isn't set up, or sending failed), so this is the only one."}
        </p>

        <Button variant="destructive" className="self-start" onClick={() => setAsking(true)}>
          <Trash2 />
          Delete
        </Button>
      </SheetBody>
      <Confirm
        open={asking}
        onOpenChange={setAsking}
        title="Delete this message?"
        description={`${e.name}'s message is removed for good.`}
        action={busy ? "Deleting…" : "Delete"}
        busy={busy}
        destructive
        onConfirm={remove}
      />
    </>
  );
}

function Contact({ icon: Icon, href, value }: { icon: typeof Mail; href: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-2 pr-2 pl-3.5 last:border-b-0">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <a href={href} className="min-w-0 flex-1 truncate text-sm text-foreground underline-offset-4 hover:underline">
        {value}
      </a>
      <CopyButton text={value} />
    </div>
  );
}

/** How many messages are newer than the last visit to the Inbox. */
export function useUnread() {
  const { enquiries } = useDashboard();
  const data = enquiries.data;
  if (!data) return 0;
  return data.enquiries.filter((e) => !data.seen || e.at > data.seen).length;
}

/* ── Site chats: visitors talking to AI Novel ─────────────────────────── */

function SiteChats({ open, onOpen, onClose }: { open: string | null; onOpen: (id: string) => void; onClose: () => void }) {
  const data = useApi<SiteChatData>("/api/dashboard/sitechat");
  const rows = data.data?.chats;
  return (
    <>
      {data.error && !rows ? (
        <Problem message={data.error} onRetry={data.reload} />
      ) : !rows ? (
        <ListSkeleton />
      ) : rows.length ? (
        <ol className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          {rows.map((c) => (
            <ChatRow key={c.id} c={c} onOpen={() => onOpen(c.id)} />
          ))}
        </ol>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <MessageCircle className="size-6 text-muted-foreground" />
          <p className="font-semibold text-foreground">No site chats yet</p>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            When a visitor asks AI Novel something, the whole conversation lands here. It&apos;s switched on and off in Settings.
          </p>
        </div>
      )}
      <ChatSheet open={open} onClose={onClose} onDeleted={data.reload} />
    </>
  );
}

function ChatRow({ c, onOpen }: { c: SiteChatSummary; onOpen: () => void }) {
  const where = [c.country && countryName(c.country), c.device, c.lang === "id" ? "Bahasa" : null].filter(Boolean).join(" · ");
  return (
    <li className="border-b border-border last:border-b-0">
      <button type="button" onClick={onOpen} className="flex w-full flex-col gap-1 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-accent">
        <span className="flex items-baseline gap-2">
          <span className="line-clamp-2 min-w-0 flex-1 text-[0.9375rem] font-medium text-foreground">{c.first || "(no question)"}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{ago(c.updatedAt)}</span>
        </span>
        <span className="text-[0.8125rem] text-muted-foreground">
          {c.turns} {c.turns === 1 ? "question" : "questions"}
          {where && ` · ${where}`}
        </span>
      </button>
    </li>
  );
}

function ChatSheet({ open, onClose, onDeleted }: { open: string | null; onClose: () => void; onDeleted: () => void }) {
  // Keep showing the chat while the panel slides away.
  const [shown, setShown] = useState(open);
  if (open && open !== shown) setShown(open);
  return (
    <Sheet open={Boolean(open)} onOpenChange={(next) => !next && onClose()}>
      <SheetContent>{shown && <Transcript key={shown} id={shown} onDeleted={() => (onClose(), onDeleted())} />}</SheetContent>
    </Sheet>
  );
}

function Transcript({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const chat = useApi<SiteChat>(`/api/dashboard/sitechat/${id}`);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = chat.data;

  const remove = async () => {
    setBusy(true);
    try {
      await send(`/api/dashboard/sitechat/${id}`, "DELETE");
      toast.success("Chat deleted.");
      onDeleted();
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  };

  if (!c) {
    return (
      <SheetHeader>
        <SheetTitle>{chat.error ? "This chat is gone" : "Loading the chat"}</SheetTitle>
        <SheetDescription>{chat.error ?? "One moment."}</SheetDescription>
      </SheetHeader>
    );
  }
  const where = [c.country && countryName(c.country), c.device, c.lang === "id" ? "in Bahasa" : "in English"].filter(Boolean).join(" · ");
  return (
    <>
      <SheetHeader>
        <SheetTitle>Site chat</SheetTitle>
        <SheetDescription>
          {date(c.startedAt)}, {clock(c.startedAt)} · {where}
        </SheetDescription>
      </SheetHeader>
      <SheetBody>
        <ol className="flex flex-col gap-3">
          {c.messages.map((m) => {
            // The answer's markdown, read as text: **bold** plain, links as "words (/path)".
            const text = m.parts
              .map((p) => (p.type === "text" ? p.text : ""))
              .join("")
              .replace(/\*\*(.+?)\*\*/g, "$1")
              .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)");
            const visitor = m.role === "user";
            return (
              <li key={m.id} className={cn("flex flex-col gap-1", visitor ? "items-end" : "items-start")}>
                <span className="px-1 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">{visitor ? "Visitor" : "AI Novel"}</span>
                <p
                  className={cn(
                    "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap text-foreground",
                    visitor ? "rounded-br-md bg-secondary" : "rounded-bl-md border border-border bg-card",
                  )}
                >
                  {text || <span className="text-muted-foreground">(no answer)</span>}
                </p>
              </li>
            );
          })}
        </ol>
        <p className="text-[0.8125rem] leading-snug text-muted-foreground">
          Visitors aren&apos;t asked for an email here: AI Novel points anyone who wants a reply to the contact form, so a good lead usually arrives in Messages too.
        </p>
        <Button variant="destructive" className="self-start" onClick={() => setAsking(true)}>
          <Trash2 />
          Delete
        </Button>
      </SheetBody>
      <Confirm
        open={asking}
        onOpenChange={setAsking}
        title="Delete this chat?"
        description="The conversation is removed for good."
        action={busy ? "Deleting…" : "Delete"}
        busy={busy}
        destructive
        onConfirm={remove}
      />
    </>
  );
}
