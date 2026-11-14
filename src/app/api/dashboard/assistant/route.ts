import { convertToModelMessages, createUIMessageStreamResponse, safeValidateUIMessages, streamText, toUIMessageStream, type UIMessage } from "ai";
import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { assistantModel, assistantReady, listChats, saveChat, systemPrompt, validChatId, withinLimit } from "@/lib/dashboard/assistant";
import { siteOrigin } from "@/app/dashboard/origin";

/** A proposal with thinking can take a while; the phone keeps the stream open until it's done. */
export const maxDuration = 300;

const noStore = { "Cache-Control": "no-store" };
/** Far above a long chat with a pasted job post in every turn; stops a request carrying megabytes. */
const MAX_MESSAGES = 80;
const MAX_CHARS = 200_000;

/** The saved chats, newest first, and whether a model is set up. */
export async function GET(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  return Response.json({ chats: await listChats(), ready: assistantReady() }, { headers: noStore });
}

/** One turn of a chat, streamed back as `useChat` expects: `{ id, messages }`. Saved when it ends. */
export async function POST(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (!validChatId(id) || !Array.isArray(body?.messages)) return Response.json({ error: "Invalid request." }, { status: 400 });
  if (!assistantReady()) {
    return Response.json({ error: "No model is set up: add ANTHROPIC_API_KEY (or AI_GATEWAY_API_KEY) to the environment." }, { status: 503 });
  }

  const checked = await safeValidateUIMessages<UIMessage>({ messages: body.messages });
  if (!checked.success) return Response.json({ error: "Invalid messages." }, { status: 400 });
  // Only the two sides of the conversation: the instructions come from the server.
  const messages = checked.data.filter((m) => m.role === "user" || m.role === "assistant");
  const size = JSON.stringify(messages).length;
  if (!messages.length || messages.length > MAX_MESSAGES || size > MAX_CHARS) {
    return Response.json({ error: "This chat is too long. Start a new one." }, { status: 413 });
  }
  if (!(await withinLimit())) return Response.json({ error: "That's a lot of drafts for one hour. Try again in a while." }, { status: 429 });

  const { model, providerOptions } = assistantModel();
  const result = streamText({
    model,
    providerOptions,
    // Long and the same on every turn, so it is cached: later turns cost a fraction and start sooner.
    instructions: {
      role: "system",
      content: await systemPrompt(await siteOrigin()),
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    },
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 16_000,
    abortSignal: request.signal,
  });

  return createUIMessageStreamResponse({
    headers: noStore,
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      sendReasoning: false,
      onError: (error) => {
        console.error("assistant:", error);
        return "The model couldn't answer just now. Try again in a moment.";
      },
      onEnd: async ({ messages: all }) => {
        await saveChat(id, all).catch((e) => console.error("assistant: couldn't save the chat", e));
      },
    }),
  });
}
