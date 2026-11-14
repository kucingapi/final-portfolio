import { convertToModelMessages, createUIMessageStreamResponse, generateId, safeValidateUIMessages, streamText, toUIMessageStream, type UIMessage } from "ai";
import { userAgent } from "next/server";
import { siteOrigin } from "@/app/dashboard/origin";
import { fromTester } from "@/lib/cv/store";
import { report } from "@/lib/dashboard/activity";
import { assistantModel, validChatId } from "@/lib/dashboard/assistant";
import { visitFrom } from "@/lib/dashboard/posthog";
import { LIMITS, getSiteChat, getSiteChatConfig, saveSiteChat, siteChatLive, siteChatPrompt, textOf, underSiteCap, type SiteChat } from "@/lib/dashboard/sitechat";
import { describeClick } from "@/lib/dashboard/visitor";
import { LANGS, type Lang } from "@/lib/i18n/lang";
import { tooMany } from "@/lib/rate";

/**
 * "Ask AI Novel" on the portfolio. Each request brings one new message; the conversation so far is read
 * from the store, so a visitor can't hand the model a history of their own. See
 * src/lib/dashboard/sitechat.ts.
 */

export const maxDuration = 120;

const noStore = { "Cache-Control": "no-store" };
/** Errors the widget shows in the visitor's language, by code; the text is for logs and curl. */
const refuse = (code: string, error: string, status: number) => Response.json({ code, error }, { status, headers: noStore });

/** Whether the chat is on, so the site only offers it when it can answer. Shared caches may keep it a minute. */
export async function GET() {
  return Response.json({ enabled: await siteChatLive() }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } });
}

export async function POST(request: Request) {
  const from = request.headers.get("sec-fetch-site");
  if (from === "cross-site" || from === "same-site") return refuse("forbidden", "Please use the chat on this site.", 403);
  if (userAgent(request).isBot) return refuse("forbidden", "Not for bots.", 403);
  if (!(await siteChatLive())) return refuse("off", "The chat is switched off.", 503);

  const body = await request.json().catch(() => null);
  const id = body?.id;
  const lang: Lang = LANGS.includes(body?.lang) ? body.lang : "en";
  if (!validChatId(id) || !body?.message) return refuse("invalid", "Invalid request.", 400);
  const checked = await safeValidateUIMessages<UIMessage>({ messages: [body.message] });
  const message = checked.success ? checked.data[0] : null;
  const text = message ? textOf(message).trim() : "";
  if (!message || message.role !== "user" || !text) return refuse("invalid", "Invalid message.", 400);
  if (text.length > LIMITS.charsPerMessage) return refuse("long", "That message is too long.", 413);
  // Only the words go on: no files, no made-up parts.
  const incoming: UIMessage = { id: message.id, role: "user", parts: [{ type: "text", text }] };

  if ((await tooMany("sitechat", request, LIMITS.perVisitorHour, 3600)).over || (await tooMany("sitechat-day", request, LIMITS.perVisitorDay, 86_400)).over) {
    return refuse("busy", "Too many messages from here. Try again later.", 429);
  }
  const stored = await getSiteChat(id);
  const turns = stored?.messages.filter((m) => m.role === "user").length ?? 0;
  if (turns >= LIMITS.turnsPerChat) return refuse("full", "This chat is full. Start a new one.", 429);
  if (!(await underSiteCap())) return refuse("busy", "The chat has had a busy day. Try again tomorrow.", 429);

  const now = new Date().toISOString();
  const { country, device } = describeClick(request);
  const chat: SiteChat = stored ?? { id, startedAt: now, updatedAt: now, lang, country, device, messages: [] };
  const messages = [...chat.messages, incoming];
  const { model } = await getSiteChatConfig();

  const result = streamText({
    model: assistantModel(model),
    instructions: {
      role: "system",
      content: await siteChatPrompt(await siteOrigin(), lang),
      providerOptions: { openrouter: { cacheControl: { type: "ephemeral" } } },
    },
    messages: await convertToModelMessages(messages),
    // Answers are a few sentences; the room above that is for models that think before answering.
    maxOutputTokens: 2000,
    abortSignal: request.signal,
  });

  const tester = fromTester(request);
  const visit = visitFrom(request);
  return createUIMessageStreamResponse({
    headers: noStore,
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      // Answers are stored, so each gets its own id here (left out, it would be saved without one).
      generateMessageId: generateId,
      sendReasoning: false,
      onError: (error) => {
        console.error("sitechat:", error);
        return "error";
      },
      onEnd: async ({ messages: all }) => {
        try {
          await saveSiteChat({ ...chat, lang, updatedAt: new Date().toISOString(), messages: all }, !stored);
          // A new conversation is news (the feed and the phone); Novel's own browser isn't.
          if (!stored && !tester) {
            const detail = text.length > 120 ? `${text.slice(0, 117)}…` : text;
            await report({ at: now, kind: "chat", ref: `sitechat:${id}`, name: "Site chat", detail, country, device, ...visit });
          }
        } catch (e) {
          console.error("sitechat: couldn't save", e);
        }
      },
    }),
  });
}
