import { anthropic, type AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import { gateway, type UIMessage } from "ai";
import { getCvContent, getProjects, getSiteContent } from "@/lib/content/read";
import type { CvContent, Project, SiteContent } from "@/lib/content/schema";
import { titleFor } from "./assistant-templates";
import { countUp, deleteValue, getValue, setValue } from "./state";

/**
 * The dashboard's writing assistant: Upwork cover letters, screening answers, interview prep and client
 * replies, written from the published CV, projects and site copy, never from anything else. Chats are
 * kept in the dashboard's store so a proposal can be picked up again from the phone or the laptop.
 * Server only.
 */

/* ── Model ────────────────────────────────────────────────────────────── */

const MODEL = process.env.ASSISTANT_MODEL?.trim() || "claude-opus-5-5";

/**
 * Claude through Anthropic's API when `ANTHROPIC_API_KEY` is set, else through Vercel's AI Gateway
 * (`AI_GATEWAY_API_KEY`, or the deployment's own OIDC token on Vercel).
 */
export function assistantModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      model: anthropic(MODEL),
      providerOptions: {
        // Writing reads better with a little thought; medium keeps a phone waiting a few seconds, not a minute.
        // A turn the safety classifiers decline is retried on Anthropic's recommended fallback model.
        anthropic: { effort: "medium", fallbacks: "default" } satisfies AnthropicLanguageModelOptions,
      },
    };
  }
  // The Gateway names models with dots ("anthropic/claude-opus-5.5"); a full Gateway id is used as is.
  const id = MODEL.includes("/") ? MODEL : `anthropic/${MODEL.replace(/^(claude-[a-z]+-\d+)-(\d+)$/, "$1.$2")}`;
  return { model: gateway(id), providerOptions: { anthropic: { effort: "medium" } satisfies AnthropicLanguageModelOptions } };
}

/** Whether a model can be reached at all; without one the view explains what to set. */
export const assistantReady = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL);

/** A cap on runaway spending (a stuck retry loop, a stolen session): plenty for a day of proposals. */
const PER_HOUR = 60;
export async function withinLimit() {
  return (await countUp("dash:assistant:count", 3600)) <= PER_HOUR;
}

/* ── What it knows ────────────────────────────────────────────────────── */

const placeholder = (t: SiteContent["testimonials"][number]) => /^placeholder/i.test(t.quote) || /\bName\b/.test(t.name);

function cvText(cv: CvContent, site: SiteContent, origin: string) {
  const out: string[] = [];
  const h = cv.header;
  out.push(`Name: ${h.name}`, `Headlines I use: ${h.headlines.join(" / ")}`, `Based in: ${h.location}`);
  if (site.site.social.upwork) out.push(`Upwork profile: ${site.site.social.upwork}`);
  out.push(`Portfolio: ${origin}`, "");
  out.push("## Summaries I've written", ...cv.summaries.map((s) => `- ${s.text}`), "");
  const sections = ["experience", "projects", "education", "awards"] as const;
  for (const section of sections) {
    const entries = cv.entries.filter((e) => e.section === section);
    if (!entries.length) continue;
    out.push(`## CV: ${section}`);
    for (const e of entries) {
      const also = e.titles.length > 1 ? ` (can also go by: ${e.titles.slice(1).join(", ")})` : "";
      out.push(`### ${e.titles[0]}${e.note ? `, ${e.note}` : ""} at ${e.org}${e.place ? `, ${e.place}` : ""}: ${e.period}${also}`);
      if (e.grade) out.push(`Result: ${e.grade}`);
      if (e.about) out.push(e.about);
      for (const b of e.bullets) out.push(`- ${b.text}`);
      if (e.stack?.length) out.push(`Tech: ${e.stack.join(", ")}`);
      if (e.link) out.push(`Case study: ${origin}${e.link}`);
    }
    out.push("");
  }
  out.push("## Skills", ...cv.skills.map((g) => `- ${g.label}: ${g.items.join(", ")}`), "");
  return out.join("\n");
}

function projectText(p: Project, origin: string) {
  const out = [`### ${p.title}${p.fullName ? ` (${p.fullName})` : ""}: ${p.kind}, ${p.platform}, ${p.context}`];
  out.push(`Client: ${p.client} · Role: ${p.role} · ${p.period}`, `Headline number: ${p.stat.value} ${p.stat.label}`);
  if (p.status) out.push(`Status: ${p.status.label}. ${p.status.note}`);
  out.push(`Link: ${origin}/projects/${p.slug}`, `Summary: ${p.summary}`, `Stack: ${p.stack.join(", ")}`);
  out.push(...p.intro, "My part:", ...p.part.map((x) => `- ${x}`));
  for (const c of p.chapters) {
    out.push(`#### ${c.title}`, `Problem: ${c.problem}`, ...c.did.map((d) => `- ${d}`), `Result: ${c.result}`);
    if (c.figure) out.push(`Figure: ${c.figure.from ? `${c.figure.from} → ` : ""}${c.figure.to} ${c.figure.label}`);
  }
  if (p.method) out.push(`How it was done: ${p.method}`);
  return out.join("\n");
}

function siteText(site: SiteContent) {
  const out = ["## About me", site.about, "", `## How I work: ${site.philosophy.title}`, site.philosophy.lede];
  for (const s of site.philosophy.steps) out.push(`- ${s.title}: ${s.body}`);
  out.push(`- ${site.philosophy.pledge.lead} ${site.philosophy.pledge.mark} ${site.philosophy.pledgeNote}`, "");
  const real = site.testimonials.filter((t) => !placeholder(t));
  if (real.length) {
    out.push("## What people have said (quote word for word, or not at all)");
    for (const t of real) out.push(`- "${t.quote}" (${t.name}, ${t.role}; my ${t.relation.toLowerCase()})`);
    out.push("");
  }
  return out.join("\n");
}

/** Everything the assistant may draw on, as one document. */
export async function profileText(origin: string) {
  const [cv, projects, site] = await Promise.all([getCvContent(), getProjects(), getSiteContent()]);
  return [
    `# ${cv.header.name}: profile`,
    cvText(cv, site, origin),
    siteText(site),
    "## Case studies (on the portfolio, newest work first)",
    ...projects.map((p) => projectText(p, origin)),
  ].join("\n\n");
}

const RULES = `You write Upwork proposals and client messages for Novel, a freelance software developer, in Novel's own voice (first person, "I"). You are talking with Novel directly, in a private dashboard: Novel pastes a job post or a client message, and you write what Novel will paste into Upwork.

# Ground rules
- Use only what Novel's profile below says. Never invent a client, project, number, tool, year of experience or testimonial. If the job asks for something the profile can't back up, don't claim it: lean on the closest real experience and say plainly what transfers, then tell Novel in Notes what was missing.
- Upwork bars sharing contact details before a contract: no email, phone, WhatsApp, Telegram or other off-platform contact, and no "let's move this off Upwork". Links to the portfolio's case studies and the Upwork profile are fine; add one or two only where they prove the point.
- Write in the language of the job post or the client's message (usually English), whatever language Novel writes to you in.
- Plain, warm, specific. No "Dear Hiring Manager", "I hope this finds you well", "I am excited to apply", "I'm the perfect fit", buzzwords, or exclamation marks. No em dashes. Short paragraphs a client can scan.
- Prices, dates and availability only when Novel gives them; otherwise leave them out or put a [bracketed placeholder] and mention it in Notes.

# Tasks
Novel's first message usually starts with "Task: …", from a template. Each task's answer is laid out as sections, each starting with a line "### <Section name>", so the dashboard can give every section its own Copy button. Inside a section put only the text to paste: no commentary, no quotes around it, no markdown headings. Plain line breaks between paragraphs; "-" bullets only where a list really helps.

## Cover letter
- "### Cover letter". The first two lines are all a client sees in the list of proposals, so open with their problem or goal in their own words and why Novel is a match, never with Novel's name or a greeting beyond "Hi" (or "Hi <name>" when the post signs off with a name).
- Then one or two pieces of real work that match the job most closely, each with what changed (a number when the profile has one), and a link to the case study when it helps.
- Then a short, concrete plan for their project: two to four steps or the first thing Novel would do. If the post hides a check ("start your proposal with the word…"), follow it.
- End with one specific question about their project, which invites a reply. Sign off with "Novel".
- Keep to the length the task asks for (about 150–220 words by default).

## Screening questions
- One section per question: "### Q1: <the question, shortened if long>", "### Q2: …". Answer each on its own (a client may read them out of order), directly, in 40–120 words unless the question needs more, with evidence from the profile.

## Cover letter + questions
- "### Cover letter" as above, then "### Q1: …" and the rest.

## Interview prep
- "### Likely questions": 6–8 questions this client will probably ask on a call, from the post.
- Then one section per question, "### Q1: <question>", with what Novel can say, as short talking points with the project and number to mention.
- "### Questions to ask them": 3–5 sharp questions about scope, users, success and how they work.

## Reply to a client
- "### Reply": a message for Upwork chat. Short (under 120 words unless it needs more), answers what they asked, moves things forward (a call, a next step, a question).

## After every answer
- End with "### Notes" only when there is something Novel should know: a claim you couldn't back up, a placeholder to fill, a red flag in the post (vague scope, free test work, a budget far below the work, a request to pay or chat outside Upwork). Keep it to a few short bullets. This section is for Novel, not the client.

# Follow-ups
When Novel asks for a change ("shorter", "lead with AgentFlow", "more casual"), rewrite and send back the full section(s) again with the same headings, so Novel can copy the latest version. Questions about the job or the profile can be answered in plain text without sections.`;

/** The system prompt: the rules, then the profile. The same for every turn, so it caches. */
export async function systemPrompt(origin: string) {
  return `${RULES}\n\n# Novel's profile\n\n${await profileText(origin)}`;
}

/* ── Saved chats ──────────────────────────────────────────────────────── */

export type ChatSummary = { id: string; title: string; createdAt: string; updatedAt: string };
export type StoredChat = ChatSummary & { messages: UIMessage[] };

const INDEX = "dash:assistant:index";
const chatKey = (id: string) => `dash:assistant:chat:${id}`;
/** The newest chats kept; older ones are deleted as new ones arrive. */
const MAX_CHATS = 60;

export const validChatId = (id: unknown): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{8,48}$/.test(id);

export async function listChats(): Promise<ChatSummary[]> {
  return (await getValue<ChatSummary[]>(INDEX)) ?? [];
}

export async function getChat(id: string): Promise<StoredChat | null> {
  return validChatId(id) ? getValue<StoredChat>(chatKey(id)) : null;
}

const firstText = (messages: UIMessage[]) =>
  messages
    .find((m) => m.role === "user")
    ?.parts.map((p) => (p.type === "text" ? p.text : ""))
    .join("") ?? "";

/** Store a chat after a turn, newest first in the list. */
export async function saveChat(id: string, messages: UIMessage[]) {
  const now = new Date().toISOString();
  const index = await listChats();
  const old = index.find((c) => c.id === id);
  const summary: ChatSummary = { id, title: old?.title ?? titleFor(firstText(messages)), createdAt: old?.createdAt ?? now, updatedAt: now };
  // Reasoning parts are empty (the model's thinking isn't returned) and only take up room.
  const kept = messages.map((m) => ({ ...m, parts: m.parts.filter((p) => p.type !== "reasoning") }));
  await setValue(chatKey(id), { ...summary, messages: kept } satisfies StoredChat);
  const next = [summary, ...index.filter((c) => c.id !== id)];
  await setValue(INDEX, next.slice(0, MAX_CHATS));
  await Promise.all(next.slice(MAX_CHATS).map((c) => deleteValue(chatKey(c.id))));
}

export async function deleteChat(id: string) {
  const index = await listChats();
  if (!index.some((c) => c.id === id)) return false;
  await setValue(
    INDEX,
    index.filter((c) => c.id !== id),
  );
  await deleteValue(chatKey(id));
  return true;
}
