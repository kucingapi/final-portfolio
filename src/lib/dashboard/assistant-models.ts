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

export const money = (usd: number) => (usd < 0.01 ? "<$0.01" : `$${usd.toFixed(2)}`);

/** A name for an id without the live list: the pick's label, else the part after the slash. */
export const shortName = (id: string, models?: ModelInfo[]) =>
  PICKS.find((p) => p.id === id)?.label ?? models?.find((m) => m.id === id)?.name.replace(/^[^:]+:\s*/, "") ?? id.split("/").pop() ?? id;
