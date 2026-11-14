"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, generateId, type UIMessage } from "ai";
import { ArrowUp, RotateCcw, Sparkles, Square, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useLenis } from "@/components/providers/SmoothScroll";
import { TransitionLink } from "@/components/transition/PageTransition";
import { track } from "@/lib/analytics";
import { useLang, useUi } from "@/lib/i18n/client";

/**
 * "Ask AI Novel": a chat in the corner of every page, answered by an AI that speaks as Novel from the
 * published content (src/lib/dashboard/sitechat.ts). It only shows when the dashboard has it switched
 * on. The conversation carries on across pages, as the site's chrome stays mounted between them.
 *
 * It sits outside the site's design-pixel canvas, so its sizes are plain pixels: chat text has to stay
 * readable whatever the window's width.
 */

type Message = UIMessage;

export function SiteChat() {
  const t = useUi().chat;
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  // Made when the chat first opens (never while the page prerenders, where randomness isn't allowed); a
  // new one starts a new conversation ("Start over").
  const [chatId, setChatId] = useState<string | null>(null);
  const lenis = useLenis();

  useEffect(() => {
    // After the page has settled: the chat is never what a visitor came for first.
    const timer = setTimeout(() => {
      fetch("/api/chat")
        .then((r) => r.json())
        .then((r) => setEnabled(r.enabled === true))
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // On a phone the chat covers the page, which shouldn't scroll behind it.
  useEffect(() => {
    if (!open || !matchMedia("(max-width: 1023.98px)").matches) return;
    const l = lenis.current;
    l?.stop();
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      l?.start();
      document.documentElement.style.overflow = overflow;
    };
  }, [open, lenis]);

  if (!enabled) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => {
            if (!chatId) setChatId(generateId());
            setOpen(true);
            track("site_chat_opened");
          }}
          className="fixed right-[16px] bottom-[max(16px,env(safe-area-inset-bottom))] z-[60] flex h-[48px] items-center gap-[8px] rounded-full border border-white/15 bg-midnight-500 pr-[18px] pl-[14px] font-sans text-[15px] font-semibold text-white shadow-[0_12px_40px_rgb(1_3_38/0.6)] transition-colors duration-200 hover:bg-midnight-400 md:right-[24px] md:bottom-[24px]"
        >
          <Sparkles className="size-[18px]" aria-hidden />
          {t.open}
        </button>
      )}
      {open && chatId && (
        <div
          role="dialog"
          aria-label={t.title}
          data-lenis-prevent
          className="fixed z-[80] flex flex-col overflow-hidden bg-midnight-950 font-sans text-white max-md:inset-0 max-md:pt-[env(safe-area-inset-top)] md:right-[24px] md:bottom-[24px] md:h-[min(640px,calc(100dvh-48px))] md:w-[400px] md:rounded-[24px] md:border md:border-white/12 md:shadow-[0_24px_80px_rgb(0_0_0/0.6)]"
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <Conversation key={chatId} onClose={() => setOpen(false)} onRestart={() => setChatId(generateId())} id={chatId} />
        </div>
      )}
    </>
  );
}

function Conversation({ id, onClose, onRestart }: { id: string; onClose: () => void; onRestart: () => void }) {
  const t = useUi().chat;
  const lang = useLang();
  const transport = useMemo(
    () =>
      new DefaultChatTransport<Message>({
        api: "/api/chat",
        // Only the new message goes: the server keeps the conversation.
        prepareSendMessagesRequest: ({ id, messages }) => ({ body: { id, lang, message: messages[messages.length - 1] } }),
        fetch: async (input, init) => {
          const res = await fetch(input, init);
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).code ?? "error");
          return res;
        },
      }),
    [lang],
  );
  const { messages, sendMessage, status, stop, error, clearError } = useChat<Message>({ id, transport, throttle: 50 });
  const busy = status === "submitted" || status === "streaming";
  const [text, setText] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => input.current?.focus({ preventScroll: true }), []);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: status === "streaming" ? "auto" : "smooth" });
  }, [messages, status]);

  const submit = (value: string) => {
    const clean = value.trim();
    if (!clean || busy) return;
    clearError();
    sendMessage({ text: clean.slice(0, 1000) });
    setText("");
    track("site_chat_message", { turn: messages.filter((m) => m.role === "user").length + 1 });
  };

  const errorText = error ? (t.errors[error.message] ?? t.errors.error) : null;

  return (
    <>
      <header className="flex items-start gap-[12px] border-b border-white/10 px-[18px] py-[14px]">
        <span aria-hidden className="mt-[2px] grid size-[36px] shrink-0 place-items-center rounded-full bg-midnight-500 text-[15px] font-bold">
          N
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-[6px] text-[16px] font-semibold">
            {t.title}
            <span className="rounded-full bg-white/10 px-[7px] py-[1px] text-[11px] font-semibold tracking-wide text-midnight-100 uppercase">AI</span>
          </p>
          <p className="mt-[2px] text-[12.5px] leading-[1.35] text-midnight-100/75">{t.subtitle}</p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={onRestart} aria-label={t.restart} title={t.restart} className="grid size-[36px] shrink-0 place-items-center rounded-full text-midnight-100 transition-colors hover:bg-white/10">
            <RotateCcw className="size-[17px]" />
          </button>
        )}
        <button type="button" onClick={onClose} aria-label={t.close} className="grid size-[36px] shrink-0 place-items-center rounded-full text-midnight-100 transition-colors hover:bg-white/10">
          <X className="size-[20px]" />
        </button>
      </header>

      <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain px-[16px] py-[16px]">
        <ol className="flex flex-col gap-[12px]" aria-live="polite">
          <li>
            <Bubble from="assistant">{t.greeting}</Bubble>
          </li>
          {messages.map((m) => (
            <li key={m.id}>
              <Bubble from={m.role === "user" ? "user" : "assistant"}>
                {m.role === "user" ? m.parts.map((p) => (p.type === "text" ? p.text : "")).join("") : <Rich text={m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")} />}
              </Bubble>
            </li>
          ))}
          {status === "submitted" && (
            <li className="flex items-center gap-[8px] px-[4px] text-[13px] text-midnight-100/70">
              <Sparkles className="size-[14px] animate-pulse" aria-hidden />
              {t.thinking}
            </li>
          )}
        </ol>

        {messages.length === 0 && (
          <ul className="mt-[14px] flex flex-wrap gap-[8px]">
            {t.starters.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border border-white/15 px-[12px] py-[7px] text-[13.5px] text-midnight-50 transition-colors hover:border-midnight-400 hover:bg-white/5"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}

        {errorText && (
          <p role="alert" className="mt-[12px] rounded-[14px] border border-white/10 bg-white/5 px-[14px] py-[10px] text-[13.5px] leading-[1.45] text-midnight-50">
            {errorText}{" "}
            <TransitionLink href="/contact" onClick={onClose} className="font-semibold text-midnight-200 underline underline-offset-2">
              {t.contact}
            </TransitionLink>
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
        className="border-t border-white/10 px-[12px] pt-[10px] pb-[max(10px,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-end gap-[8px] rounded-[20px] border border-white/15 bg-white/5 p-[6px] pl-[14px] focus-within:border-midnight-400">
          <label htmlFor="site-chat-input" className="sr-only">
            {t.placeholder}
          </label>
          <textarea
            id="site-chat-input"
            ref={input}
            value={text}
            maxLength={1000}
            rows={1}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                submit(text);
              }
            }}
            placeholder={t.placeholder}
            // The site's focus ring (globals.css, outside Tailwind's layers) would draw a box inside the
            // field, whose own border already lights up on focus.
            style={{ outline: "none" }}
            className="field-sizing-content max-h-[120px] min-h-[36px] flex-1 resize-none bg-transparent py-[8px] text-[16px] leading-[1.35] text-white outline-none placeholder:text-midnight-100/45 md:text-[15px]"
          />
          {busy ? (
            <button type="button" onClick={() => stop()} aria-label={t.stop} className="grid size-[38px] shrink-0 place-items-center rounded-full bg-white/10 text-white">
              <Square className="size-[14px] fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label={t.send}
              className="grid size-[38px] shrink-0 place-items-center rounded-full bg-midnight-500 text-white transition-colors hover:bg-midnight-400 disabled:opacity-40"
            >
              <ArrowUp className="size-[19px]" />
            </button>
          )}
        </div>
        <p className="mt-[6px] px-[6px] text-[11.5px] text-midnight-100/55">{t.saved}</p>
      </form>
    </>
  );
}

function Bubble({ from, children }: { from: "user" | "assistant"; children: React.ReactNode }) {
  return (
    <div
      className={
        from === "user"
          ? "ml-auto w-fit max-w-[85%] rounded-[18px] rounded-br-[6px] bg-midnight-500 px-[14px] py-[9px] text-[15px] leading-[1.45] break-words whitespace-pre-wrap"
          : "w-fit max-w-[92%] rounded-[18px] rounded-bl-[6px] bg-white/[0.07] px-[14px] py-[10px] text-[15px] leading-[1.5] break-words text-midnight-50"
      }
    >
      {children}
    </div>
  );
}

/* ── The model's words: paragraphs, "-" lists, **bold** and links ──────── */

/** Pages on this site as they are, and https addresses elsewhere; anything else stays text. */
const safeHref = (href: string) => (/^\/(?!\/)/.test(href) ? href : /^https:\/\//.test(href) ? href : null);

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const href = safeHref(link[2]);
      if (!href) return <Fragment key={i}>{link[1]}</Fragment>;
      const cls = "font-semibold text-midnight-200 underline underline-offset-2 hover:text-white";
      return href.startsWith("/") ? (
        <TransitionLink key={i} href={href} className={cls}>
          {link[1]}
        </TransitionLink>
      ) : (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
          {link[1]}
        </a>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function Rich({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-[8px]">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i} className="flex flex-col gap-[4px] pl-[18px]">
              {lines.map((l, j) => (
                <li key={j} className="list-disc">
                  <Inline text={l.replace(/^\s*[-*•]\s+/, "")} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            <Inline text={block} />
          </p>
        );
      })}
    </div>
  );
}
