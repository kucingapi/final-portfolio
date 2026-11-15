"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, generateId, type UIMessage } from "ai";
import {
  ArrowUp,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  FileText,
  Layers,
  ListChecks,
  Mail,
  MessagesSquare,
  Reply,
  RotateCcw,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ChatSummary, StoredChat } from "@/lib/dashboard/assistant";
import { DEFAULT_MODEL, money, shortName, validModelId, type AnswerMeta, type ModelInfo } from "@/lib/dashboard/assistant-models";
import { FOLLOW_UPS, TEMPLATES, TEMPLATE_GROUPS, buildPrompt, type Template } from "@/lib/dashboard/assistant-templates";
import { send, useApi } from "./api";
import { CopyButton } from "./Copy";
import { ago } from "./format";
import { Problem } from "./Problem";
import { Button } from "./ui/button";
import { cn } from "./ui/cn";
import { Confirm } from "./ui/confirm";
import { DRAFT, ModelSheet, costLabel, type Picker } from "./ModelSheet";
import { Field } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { toast } from "./ui/toaster";

/**
 * A chat that writes Upwork proposals, application letters and emails from Novel's own CV and projects
 * (src/lib/dashboard/assistant.ts), with any model OpenRouter serves.
 * A new chat opens on the templates; filling one in sends its first message. The open chat lives in the
 * address (`?view=assistant&chat=<id>`), so the back button returns to the templates and a saved chat
 * reopens on another device.
 */

const ICONS: Record<string, typeof FileText> = {
  "cover-letter": FileText,
  screening: ListChecks,
  proposal: Layers,
  interview: MessagesSquare,
  reply: Reply,
  application: Briefcase,
  email: Mail,
};

type ChatList = { chats: ChatSummary[]; ready: boolean; defaultModel: string };
type ModelList = { models: ModelInfo[]; error?: string };
type Message = UIMessage<AnswerMeta>;

/* ── The model, remembered per device ─────────────────────────────────── */

const MODEL_KEY = "nb-assistant-model";
const MODEL_EVENT = "nb-assistant-model";
const readModel = () => {
  try {
    return localStorage.getItem(MODEL_KEY);
  } catch {
    return null;
  }
};
const onModelChange = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(MODEL_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(MODEL_EVENT, cb);
  };
};
function saveModel(id: string) {
  try {
    localStorage.setItem(MODEL_KEY, id);
  } catch {
    // A private window: the choice lasts until the page closes.
  }
  window.dispatchEvent(new Event(MODEL_EVENT));
}

/** The picked model, else the server's default (`ASSISTANT_MODEL`), else the first suggestion. */
function useModel(fallback: string | undefined) {
  const stored = useSyncExternalStore(onModelChange, readModel, () => null);
  const [session, setSession] = useState<string | null>(null);
  const id = session ?? (validModelId(stored) ? stored : (fallback ?? DEFAULT_MODEL));
  const pick = (next: string) => {
    setSession(next);
    saveModel(next);
  };
  return [id, pick] as const;
}

export function AssistantView({ chat, onOpen }: { chat: string | null; onOpen: (id: string) => void }) {
  const list = useApi<ChatList>("/api/dashboard/assistant");
  const models = useApi<ModelList>("/api/dashboard/assistant/models");
  const [model, setModel] = useModel(list.data?.defaultModel);
  const picker = { model, onModel: setModel, models: models.data?.models, modelsError: models.data?.error ?? models.error };
  // The chat a blank page starts; it takes this id in the address once its first message goes.
  const [live, setLive] = useState(() => generateId());
  // Once the address has shown this chat, coming back to a blank page starts a fresh one. (Not as soon
  // as it starts: the address catches up a render later, and a new id then would orphan the first.)
  const [shown, setShown] = useState(false);
  if (chat === live && !shown) setShown(true);
  if (!chat && shown) {
    setLive(generateId());
    setShown(false);
  }

  const start = () => onOpen(live);

  if (!chat || chat === live) {
    return (
      <Conversation
        key={live}
        id={live}
        initial={[]}
        onStart={start}
        onSettled={list.reload}
        picker={picker}
        home={(sendText) => <Home list={list} onOpen={onOpen} onSend={sendText} />}
      />
    );
  }
  return <Saved key={chat} id={chat} onSettled={list.reload} picker={picker} />;
}



/** A chat from the list: loaded, then carried on where it stopped. */
function Saved({ id, onSettled, picker }: { id: string; onSettled: () => void; picker: Picker }) {
  const saved = useApi<StoredChat>(`/api/dashboard/assistant/${id}`);
  const chat = saved.data;

  if (saved.error && !chat) return <Problem message={saved.error} onRetry={saved.reload} />;
  if (!chat) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="ml-auto h-24 w-4/5 rounded-2xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }
  // Loading it again later (the app coming back on screen) doesn't restart the chat: useChat keeps its own.
  return <Conversation id={id} initial={chat.messages as Message[]} title={chat.title} onSettled={onSettled} picker={picker} />;
}

/* ── The conversation ─────────────────────────────────────────────────── */

function Conversation({
  id,
  initial,
  title,
  onStart,
  onSettled,
  picker,
  home,
}: {
  id: string;
  initial: Message[];
  title?: string;
  onStart?: () => void;
  onSettled: () => void;
  picker: Picker;
  home?: (send: (text: string) => void) => React.ReactNode;
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport<Message>({
        api: "/api/dashboard/assistant",
        // A lapsed session reloads onto the sign-in form, as every other dashboard call does; the
        // server's own words explain any other refusal.
        fetch: async (input, init) => {
          const res = await fetch(input, init);
          if (res.status === 401) location.reload();
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error ?? `Something went wrong (${res.status}). Try again.`);
          }
          return res;
        },
      }),
    [],
  );
  const { messages, sendMessage, status, stop, error, regenerate, clearError } = useChat<Message>({
    id,
    messages: initial,
    transport,
    throttle: 50,
    onFinish: onSettled,
  });
  const busy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    if (!text.trim() || busy) return;
    if (!messages.length) onStart?.();
    clearError();
    // The model goes with each message, so one picked mid-chat writes the next answer.
    sendMessage({ text: text.trim() }, { body: { model: picker.model } });
  };

  useFollow(messages, status);

  const last = messages[messages.length - 1];
  return (
    <div className="flex flex-1 flex-col">
      {title && <p className="mb-4 truncate text-sm text-muted-foreground">{title}</p>}
      {messages.length === 0 && home ? (
        home(submit)
      ) : (
        <ol className="flex flex-col gap-5" aria-live="polite">
          {messages.map((m) => (
            <li key={m.id}>
              {m.role === "user" ? <UserMessage text={textOf(m)} /> : <Answer text={textOf(m)} meta={m.metadata} models={picker.models} />}
            </li>
          ))}
          {status === "submitted" && (
            <li>
              <Writing />
            </li>
          )}
        </ol>
      )}

      {error && (
        <div role="alert" className="mt-5 flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 p-4">
          <p className="text-sm leading-relaxed text-foreground">{error.message}</p>
          <Button size="sm" variant="secondary" onClick={() => regenerate({ body: { model: picker.model } })}>
            <RotateCcw />
            Try again
          </Button>
        </div>
      )}

      {status === "ready" && last?.role === "assistant" && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Quick changes">
          {FOLLOW_UPS.map((f) => (
            <li key={f}>
              <button
                type="button"
                onClick={() => submit(f)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-[0.8125rem] text-foreground transition-colors duration-150 hover:bg-accent"
              >
                {f}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Composer busy={busy} onSend={submit} onStop={stop} first={messages.length === 0} picker={picker} />
    </div>
  );
}

/** Keeps the newest words in view while they arrive, unless the page was scrolled up to read. */
function useFollow(messages: Message[], status: string) {
  const count = messages.length;
  useEffect(() => {
    if (count) window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }, [count]);
  useEffect(() => {
    // While it streams, and once more when it ends and the quick changes appear under it.
    if (status !== "streaming" && status !== "ready") return;
    const gap = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
    if (gap < 260) window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [messages, status]);
}

const textOf = (m: Message) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

function Composer({
  busy,
  first,
  picker,
  onSend,
  onStop,
}: {
  busy: boolean;
  first: boolean;
  picker: Picker;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState("");
  const [choosing, setChoosing] = useState(false);
  const info = picker.models?.find((m) => m.id === picker.model);
  const go = () => {
    if (!text.trim() || busy) return;
    onSend(text);
    setText("");
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
      className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 mt-auto -mx-4 bg-gradient-to-t from-background from-70% to-transparent px-4 pt-6 pb-3 md:bottom-0 md:-mx-8 md:px-8 md:pb-6"
    >
      <button
        type="button"
        onClick={() => setChoosing(true)}
        className="mb-2 flex max-w-full items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
      >
        <Sparkles className="size-3.5 shrink-0 text-primary" />
        <span className="truncate font-medium text-foreground">{shortName(picker.model, picker.models)}</span>
        {info && <span className="shrink-0 tabular-nums">{costLabel(info, DRAFT)}</span>}
        <ChevronDown className="size-3.5 shrink-0" />
      </button>
      <ModelSheet open={choosing} onOpenChange={setChoosing} picker={picker} />
      <div className="flex items-end gap-2 rounded-2xl border border-input bg-card p-2 pl-3.5 shadow-[0_8px_32px_rgb(0_0_0/0.25)] focus-within:border-primary">
        <label htmlFor="assistant-input" className="sr-only">
          Message
        </label>
        <textarea
          id="assistant-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends with a keyboard; on a phone it's a new line and the button sends.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              go();
            }
          }}
          rows={1}
          placeholder={first ? "Or just ask: a job post, an email to answer…" : "Ask for a change…"}
          className="field-sizing-content max-h-48 min-h-10 flex-1 resize-none bg-transparent py-2 text-base leading-snug text-foreground outline-none placeholder:text-muted-foreground/60 md:text-sm"
        />
        {busy ? (
          <Button type="button" size="icon" variant="secondary" onClick={onStop} aria-label="Stop">
            <Square className="size-4 fill-current" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!text.trim()} aria-label="Send" className="rounded-xl">
            <ArrowUp className="size-5" />
          </Button>
        )}
      </div>
    </form>
  );
}

function Writing() {
  return (
    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
      <Sparkles className="size-4 animate-pulse text-primary" />
      Picking the work that fits and writing…
    </div>
  );
}

/* ── Messages ─────────────────────────────────────────────────────────── */

function UserMessage({ text }: { text: string }) {
  const long = text.length > 420 || text.split("\n").length > 8;
  const [open, setOpen] = useState(false);
  return (
    <div className="ml-auto flex max-w-[88%] flex-col items-end gap-1">
      <p
        className={cn(
          "rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap text-foreground",
          long && !open && "line-clamp-6",
        )}
      >
        {text}
      </p>
      {long && (
        <button type="button" onClick={() => setOpen(!open)} className="px-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          {open ? "Show less" : "Show all"}
        </button>
      )}
    </div>
  );
}

type Section = { title: string | null; body: string };

/** Splits an answer at its "### " lines; text before the first one has no title. */
function sections(text: string): Section[] {
  const out: Section[] = [];
  let current: Section = { title: null, body: "" };
  for (const line of text.split("\n")) {
    const heading = /^#{2,4}\s+(.+?)\s*#*$/.exec(line);
    if (heading) {
      if (current.title || current.body.trim()) out.push(current);
      current = { title: heading[1].replace(/\*\*/g, ""), body: "" };
    } else current.body += `${line}\n`;
  }
  if (current.title || current.body.trim()) out.push(current);
  return out.map((s) => ({ ...s, body: s.body.trim() }));
}

/** What goes on the clipboard: the text as the client should see it, without markdown's asterisks. */
const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^\s*[*•]\s+/gm, "- ");
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** **bold** as bold; everything else as written. */
function Inline({ text }: { text: string }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

function Answer({ text, meta, models }: { text: string; meta?: AnswerMeta; models?: ModelInfo[] }) {
  const parts = sections(text);
  if (!parts.length) return null;
  return (
    <div className="flex flex-col gap-3">
      {parts.map((s, i) =>
        s.title ? (
          <SectionCard key={i} section={s} />
        ) : (
          <p key={i} className="text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-foreground">
            <Inline text={s.body} />
          </p>
        ),
      )}
      {parts.every((s) => !s.title) && <CopyButton text={plain(text)} className="self-start" />}
      {meta?.model && (
        <p className="text-xs text-muted-foreground">
          {shortName(meta.model, models)}
          {meta.cost !== undefined && ` · ${money(meta.cost)}`}
        </p>
      )}
    </div>
  );
}

function SectionCard({ section }: { section: Section }) {
  const note = /^notes?$/i.test(section.title ?? "");
  const body = plain(section.body);
  return (
    <section className={cn("overflow-hidden rounded-xl border", note ? "border-dashed border-border bg-transparent" : "border-border bg-card")}>
      <header className="flex items-center gap-3 border-b border-border py-2 pr-2 pl-4">
        <h3 className={cn("min-w-0 flex-1 truncate text-sm font-semibold", note ? "text-muted-foreground" : "text-foreground")}>{section.title}</h3>
        {!note && body && (
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {words(body)} words<span className="max-sm:hidden"> · {body.length} chars</span>
          </span>
        )}
        {!note && body && <CopyButton text={body} />}
      </header>
      <div className={cn("px-4 py-3 text-[0.9375rem] leading-relaxed break-words whitespace-pre-wrap", note ? "text-muted-foreground" : "text-foreground")}>
        {section.body ? <Inline text={section.body} /> : <span className="text-muted-foreground">…</span>}
      </div>
    </section>
  );
}

/* ── A blank chat: templates and the saved chats ──────────────────────── */

function Home({ list, onOpen, onSend }: { list: ReturnType<typeof useApi<ChatList>>; onOpen: (id: string) => void; onSend: (text: string) => void }) {
  const [picked, setPicked] = useState<Template | null>(null);
  return (
    <div className="flex flex-col gap-8">
      {list.data && !list.data.ready && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/8 p-4 text-sm leading-relaxed text-foreground">
          OpenRouter isn&apos;t set up yet. Add <code className="font-mono text-[0.8125rem]">OPENROUTER_API_KEY</code> to the
          project&apos;s environment and redeploy.
        </div>
      )}
      {picked ? (
        <TemplateForm template={picked} onBack={() => setPicked(null)} onSend={onSend} />
      ) : (
        <Templates onPick={setPicked} />
      )}
      {!picked && <Recent list={list} onOpen={onOpen} />}
    </div>
  );
}

function Templates({ onPick }: { onPick: (t: Template) => void }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">Start from a template</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Paste the job post or the email. Everything is written from your published CV, projects and testimonials, nothing made up.
        </p>
      </div>
      {TEMPLATE_GROUPS.map((g) => (
        <TemplateGroup key={g.id} label={g.label} templates={TEMPLATES.filter((t) => t.group === g.id)} onPick={onPick} />
      ))}
    </section>
  );
}

function TemplateGroup({ label, templates, onPick }: { label: string; templates: Template[]; onPick: (t: Template) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</h3>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {templates.map((t) => {
          const Icon = ICONS[t.id] ?? Sparkles;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onPick(t)}
                className="flex h-full w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors duration-150 hover:bg-accent"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="size-[1.125rem]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-semibold text-foreground">{t.label}</span>
                  <span className="mt-0.5 block text-[0.8125rem] leading-snug text-muted-foreground">{t.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TemplateForm({ template, onBack, onSend }: { template: Template; onBack: () => void; onSend: (text: string) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [choice, setChoice] = useState(template.choice?.options[0].id);
  const missing = template.fields.some((f) => f.required && !values[f.id]?.trim());
  const first = useRef<HTMLTextAreaElement>(null);
  useEffect(() => first.current?.focus({ preventScroll: true }), []);

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!missing) onSend(buildPrompt(template, values, choice));
      }}
    >
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="All templates">
          <ChevronLeft className="size-5" />
        </Button>
        <h2 className="text-base font-semibold text-foreground">{template.label}</h2>
      </div>
      {template.fields.map((f, i) => (
        <Field
          key={f.id}
          label={f.required ? f.label : `${f.label} (optional)`}
          htmlFor={`tpl-${f.id}`}
          hint={f.hint}
        >
          <textarea
            id={`tpl-${f.id}`}
            ref={i === 0 ? first : undefined}
            value={values[f.id] ?? ""}
            onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
            rows={f.rows ?? 3}
            placeholder={f.placeholder}
            className="field-sizing-content max-h-[50dvh] min-h-20 w-full rounded-lg border border-input bg-muted px-3.5 py-2.5 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-primary md:text-sm"
          />
        </Field>
      ))}
      {template.choice && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-foreground">{template.choice.label}</legend>
          <div className="flex flex-wrap gap-2">
            {template.choice.options.map((o) => (
              <button
                key={o.id}
                type="button"
                aria-pressed={choice === o.id}
                onClick={() => setChoice(o.id)}
                className="rounded-full border border-border px-3.5 py-1.5 text-[0.8125rem] text-foreground transition-colors duration-150 hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary/15"
              >
                {o.label}
                <span className="ml-1.5 text-muted-foreground">{o.prompt.replace(/^about /, "~")}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <Button type="submit" size="lg" disabled={missing} className="self-stretch sm:self-start">
        <Sparkles />
        Write it
      </Button>
    </form>
  );
}

function Recent({ list, onOpen }: { list: ReturnType<typeof useApi<ChatList>>; onOpen: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const [deleting, setDeleting] = useState<ChatSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const chats = list.data?.chats;

  if (list.error && !chats) return <Problem message={list.error} onRetry={list.reload} />;
  if (!chats) return <Skeleton className="h-32 rounded-xl" />;
  if (!chats.length) return null;

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await send(`/api/dashboard/assistant/${deleting.id}`, "DELETE");
      toast.success("Chat deleted.");
      setDeleting(null);
      list.reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const shown = all ? chats : chats.slice(0, 8);
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-foreground">Recent</h2>
      <ol className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
        {shown.map((c) => (
          <li key={c.id} className="flex items-center border-b border-border last:border-b-0">
            <button type="button" onClick={() => onOpen(c.id)} className="min-w-0 flex-1 px-4 py-3 text-left transition-colors duration-150 hover:bg-accent">
              <span className="block truncate text-[0.9375rem] font-medium text-foreground">{c.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{ago(c.updatedAt)}</span>
            </button>
            <Button variant="ghost" size="icon" className="mr-1 text-muted-foreground" onClick={() => setDeleting(c)} aria-label={`Delete ${c.title}`}>
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ol>
      {chats.length > shown.length && (
        <Button variant="link" className="self-start" onClick={() => setAll(true)}>
          Show all {chats.length}
        </Button>
      )}
      <Confirm
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this chat?"
        description={deleting ? `"${deleting.title}" is removed for good.` : ""}
        action={busy ? "Deleting…" : "Delete"}
        busy={busy}
        destructive
        onConfirm={remove}
      />
    </section>
  );
}
