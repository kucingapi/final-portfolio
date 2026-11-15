"use client";

import { Building2, CalendarDays, Inbox as InboxIcon, Languages, Mail, Phone, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { RATE_CARD, type Enquiry } from "@/lib/dashboard/enquiry-types";
import { send } from "./api";
import { CopyButton } from "./Copy";
import { useDashboard } from "./data";
import { ago, clock, countryName, date } from "./format";
import { Problem } from "./Problem";
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
export function InboxView({ open, onOpen, onClose }: { open: string | null; onOpen: (id: string) => void; onClose: () => void }) {
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

/** What the row and the panel call a message: a rate card request is not a project enquiry. */
const kindOf = (e: Enquiry) => (e.service === RATE_CARD ? `Rate card request${e.org ? ` · ${e.org}` : ""}` : e.service);

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
          <span className="mt-0.5 block text-[0.8125rem] text-muted-foreground">{kindOf(e)}</span>
          {(e.message || e.event) && <span className="mt-1 line-clamp-2 block text-sm leading-snug text-foreground/85">{e.event || e.message}</span>}
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
        When someone sends the contact form or requests your rate card, it lands here, and on your phone if notifications are on.
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
  const rateCard = e.service === RATE_CARD;
  const subject = encodeURIComponent(rateCard ? "Your rate card" : `Re: your ${e.service.toLowerCase()} enquiry`);
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
          {kindOf(e)} · {when}
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
          {e.org && <Fact icon={Building2} value={e.org} />}
          {e.event && <Fact icon={CalendarDays} value={e.event} />}
          {e.lang === "id" && <Fact icon={Languages} value="Asked in Bahasa Indonesia" />}
        </div>

        {rateCard && (
          <p className="text-[0.8125rem] leading-snug text-muted-foreground">
            To answer, make a tailored link with rates (the MCP tool save_cv_variant, with mode &quot;speaker&quot;, and lang &quot;id&quot; if they asked in Bahasa), then email its /rates?v=… link.
          </p>
        )}

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

function Fact({ icon: Icon, value }: { icon: typeof Mail; value: string }) {
  return (
    <div className="flex items-start gap-3 border-b border-border py-2.5 pr-3.5 pl-3.5 last:border-b-0">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 text-sm break-words text-foreground">{value}</span>
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
