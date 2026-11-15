/**
 * Which model writes, through OpenRouter: any model it serves can be picked, and these are the suggested
 * ones. They were chosen on 14 Nov 2026 from LMArena's creative-writing board (the closest public measure
 * of how well a model writes for people), weighed against OpenRouter's prices. Scores and prices drift:
 * the dashboard shows OpenRouter's live prices beside them, and this list is the place to update.
 * Shared by the browser and the server.
 */

export type Pick = {
  id: string;
  label: string;
  /** One or two words on why it's here. */
  tag: string;
  why: string;
};

export const PICKS: Pick[] = [
  {
    id: "anthropic/claude-sonnet-5.5",
    label: "Claude Sonnet 5.5",
    tag: "Default",
    why: "Arena creative writing ~1469 at a mid-tier price, and careful about sticking to what your CV says, which matters more here than flair.",
  },
  {
    id: "google/gemini-4-argon",
    label: "Gemini 4 Argon",
    tag: "Best per dollar now",
    why: "#1 on Arena creative writing (~1520) at Sonnet's price, but only until 30 Nov: then it doubles to Opus's price.",
  },
  {
    id: "anthropic/claude-opus-5.5",
    label: "Claude Opus 5.5",
    tag: "Best quality",
    why: "Top two on Arena creative writing (~1517–1520). Twice Sonnet's price; worth it for a job you really want.",
  },
  {
    id: "qwen/qwen3.8-max",
    label: "Qwen3.8 Max",
    tag: "Value",
    why: "The best open-weight writer on Arena (~1469, level with Sonnet) with cheaper output.",
  },
  {
    id: "z-ai/glm-5.3",
    label: "GLM 5.3",
    tag: "Budget",
    why: "Arena ~1457 for a bit over half Sonnet's price.",
  },
  {
    id: "deepseek/deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    tag: "Cheapest good one",
    why: "Arena ~1447, the lowest price that still writes a decent letter.",
  },
];

export const DEFAULT_MODEL = PICKS[0].id;

/**
 * Free models, found in OpenRouter's live list by pattern: free variants come and go (their ids end in
 * ":free"), so these are matched rather than named exactly, and any that isn't served just doesn't show.
 * Chosen on 14 Nov 2026: the free router, which keeps working as models rotate; Nemotron 3 Ultra, which
 * wrote the best of the free models in a fiction test (KudoWrite, Oct 2026); Gemma 4 31B for clean,
 * plain sentences.
 */
export const FREE_PICKS: { match: RegExp; label: string; tag: string; why: string }[] = [
  {
    match: /^openrouter\/free$/,
    label: "Free router",
    tag: "Always on",
    why: "OpenRouter picks a free model that is up right now. Quality varies from answer to answer.",
  },
  {
    match: /nemotron-3-ultra.*:free$/,
    label: "Nemotron 3 Ultra",
    tag: "Best free writer",
    why: "The strongest free writer in recent tests, with a 1M-token context.",
  },
  {
    match: /gemma-4-31b.*:free$/,
    label: "Gemma 4 31B",
    tag: "Clean prose",
    why: "Plain, tidy sentences; a good second choice when Nemotron is busy.",
  },
];

/** Free models' limits and catch, said wherever one can be picked. */
export const FREE_NOTE =
  "Free models allow 20 requests a minute and 50 a day (1,000 a day once the account has bought $10 of credits), and some of their providers log or train on what is sent. Fine for what's already public; think twice before pasting a private email.";

export const isFree = (m: ModelInfo) => m.input === 0 && m.output === 0;

/** What each answer carries: which model wrote it and what it cost on OpenRouter, in dollars. */
export type AnswerMeta = { model?: string; cost?: number };

/** A model as OpenRouter lists it, with prices per million tokens. */
export type ModelInfo = { id: string; name: string; input: number; output: number; context: number };

/** An OpenRouter model id ("vendor/model", optionally ":variant"). */
export const validModelId = (id: unknown): id is string =>
  typeof id === "string" && id.length <= 120 && /^[a-z0-9][\w.-]*\/[\w.:-]+$/i.test(id);

/** "$2 / $10" per million tokens in and out. */
export function priceLabel(m: ModelInfo | undefined) {
  if (!m) return null;
  const f = (n: number) => (n === 0 ? "free" : `$${Number(n.toFixed(2))}`);
  return `${f(m.input)} / ${f(m.output)}`;
}

/**
 * What one proposal roughly costs: about 16k tokens in (the profile and the job post) and 1k out. A
 * follow-up in the same chat costs less where the provider caches the profile.
 */
export const perDraft = (m: ModelInfo) => (16_000 * m.input + 1_000 * m.output) / 1_000_000;

export const money = (usd: number) => (usd === 0 ? "free" : usd < 0.01 ? "<$0.01" : `$${usd.toFixed(2)}`);

/** A name for an id without the live list: the pick's label, else the part after the slash. */
export const shortName = (id: string, models?: ModelInfo[]) =>
  PICKS.find((p) => p.id === id)?.label ??
  FREE_PICKS.find((p) => p.match.test(id))?.label ??
  models?.find((m) => m.id === id)?.name.replace(/^[^:]+:\s*/, "") ?? id.split("/").pop() ?? id;
