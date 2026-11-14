import { APICallError, convertToModelMessages, createUIMessageStreamResponse, generateId, safeValidateUIMessages, streamText, toUIMessageStream, type TextStreamPart, type ToolSet, type UIMessage } from "ai";
import { signedIn, unauthorized } from "@/lib/dashboard/auth";
import { assistantModel, assistantReady, defaultModel, listChats, saveChat, systemPrompt, validChatId, withinLimit } from "@/lib/dashboard/assistant";
import { validModelId, type AnswerMeta } from "@/lib/dashboard/assistant-models";
import { siteOrigin } from "@/app/dashboard/origin";

/** A long letter from a thinking model can take a while; the phone keeps the stream open until it's done. */
export const maxDuration = 300;

const noStore = { "Cache-Control": "no-store" };
/** Far above a long chat with a pasted job post in every turn; stops a request carrying megabytes. */
const MAX_MESSAGES = 80;
const MAX_CHARS = 200_000;

/** The saved chats, newest first, whether OpenRouter is set up, and the model to start with. */
export async function GET(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  return Response.json({ chats: await listChats(), ready: assistantReady(), defaultModel: defaultModel() }, { headers: noStore });
}

/** One turn of a chat, streamed back as `useChat` expects: `{ id, messages, model? }`. Saved when it ends. */
export async function POST(request: Request) {
  if (!(await signedIn(request))) return unauthorized();
  const body = await request.json().catch(() => null);
  const id = body?.id;
  if (!validChatId(id) || !Array.isArray(body?.messages)) return Response.json({ error: "Invalid request." }, { status: 400 });
  const model = body.model === undefined ? defaultModel() : body.model;
  if (!validModelId(model)) return Response.json({ error: "That isn't an OpenRouter model id." }, { status: 400 });
  if (!assistantReady()) {
    return Response.json({ error: "OpenRouter isn't set up: add OPENROUTER_API_KEY to the environment." }, { status: 503 });
  }

  const checked = await safeValidateUIMessages<UIMessage<AnswerMeta>>({ messages: body.messages });
  if (!checked.success) return Response.json({ error: "Invalid messages." }, { status: 400 });
  // Only the two sides of the conversation: the instructions come from the server.
  const messages = checked.data.filter((m) => m.role === "user" || m.role === "assistant");
  const size = JSON.stringify(messages).length;
  if (!messages.length || messages.length > MAX_MESSAGES || size > MAX_CHARS) {
    return Response.json({ error: "This chat is too long. Start a new one." }, { status: 413 });
  }
  if (!(await withinLimit())) return Response.json({ error: "That's a lot of drafts for one hour. Try again in a while." }, { status: 429 });

  const result = streamText({
    model: assistantModel(model),
    // Long and the same on every turn. Claude models cache it on this marker (later turns cost a fraction);
    // OpenAI, Gemini and DeepSeek cache a repeated prefix on their own.
    instructions: {
      role: "system",
      content: await systemPrompt(await siteOrigin()),
      providerOptions: { openrouter: { cacheControl: { type: "ephemeral" } } },
    },
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 16_000,
    abortSignal: request.signal,
  });

  // OpenRouter reports each step's cost; it is added up here and sent with the answer's end.
  let cost: number | undefined;
  const watched = result.stream.pipeThrough(
    new TransformStream<TextStreamPart<ToolSet>, TextStreamPart<ToolSet>>({
      transform(part, controller) {
        if (part.type === "finish-step") {
          const usage = part.providerMetadata?.openrouter?.usage as { cost?: unknown } | undefined;
          if (typeof usage?.cost === "number") cost = (cost ?? 0) + usage.cost;
        }
        controller.enqueue(part);
      },
    }),
  );

  return createUIMessageStreamResponse({
    headers: noStore,
    stream: toUIMessageStream<ToolSet, UIMessage<AnswerMeta>>({
      stream: watched,
      originalMessages: messages,
      // Answers are stored, so each gets its own id here (left out, it would be saved without one).
      generateMessageId: generateId,
      sendReasoning: false,
      messageMetadata: ({ part }) => (part.type === "start" ? { model } : part.type === "finish" ? { model, cost } : undefined),
      onError: (error) => {
        console.error("assistant:", error);
        // OpenRouter's own words say what went wrong (an unknown model, no credits left), and carry no secrets.
        const said = APICallError.isInstance(error) ? error.message : null;
        return said ? `${model} couldn't answer: ${said.slice(0, 240)}` : "The model couldn't answer just now. Try again in a moment.";
      },
      onEnd: async ({ messages: all }) => {
        await saveChat(id, all).catch((e) => console.error("assistant: couldn't save the chat", e));
      },
    }),
  });
}
