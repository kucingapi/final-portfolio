/**
 * The Assistant's templates: each is a short form (paste the job post, the questions, who an email is for) that becomes the
 * first message of a chat. The message names the task on its first line ("Task: Cover letter"), which the
 * system prompt (src/lib/dashboard/assistant.ts) knows how to answer, and the chat list uses for titles.
 * Shared by the browser and the server, so nothing here may import server code.
 */

export type TemplateField = {
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
  /** Rows a textarea starts at; it grows with what is pasted. */
  rows?: number;
  hint?: string;
};

export type TemplateChoice = { id: string; label: string; options: { id: string; label: string; prompt: string }[] };

export type Template = {
  id: string;
  /** Where it's listed: Upwork work, or applications and email anywhere else. */
  group: "upwork" | "other";
  label: string;
  description: string;
  fields: TemplateField[];
  /** Picked with chips; the first option is the default. */
  choice?: TemplateChoice;
};

const JOB: TemplateField = {
  id: "job",
  label: "Job post",
  placeholder: "Paste the whole post: title, description, skills, budget…",
  required: true,
  rows: 7,
};
const QUESTIONS: TemplateField = {
  id: "questions",
  label: "Screening questions",
  placeholder: "1. Describe your recent experience with similar projects\n2. …",
  required: true,
  rows: 4,
  hint: "One per line, numbered or not.",
};
const EXTRA: TemplateField = {
  id: "extra",
  label: "Anything to mention",
  placeholder: "e.g. I can start Monday, lead with AgentFlow, my bid is $40/h",
  rows: 2,
};
const LENGTH: TemplateChoice = {
  id: "length",
  label: "Length",
  options: [
    { id: "standard", label: "Standard", prompt: "about 150–220 words" },
    { id: "short", label: "Short", prompt: "under 120 words" },
    { id: "detailed", label: "Detailed", prompt: "about 250–350 words" },
  ],
};

export const TEMPLATES: Template[] = [
  {
    id: "cover-letter",
    group: "upwork",
    label: "Cover letter",
    description: "A proposal for one job post, from the projects that fit it best.",
    fields: [JOB, EXTRA],
    choice: LENGTH,
  },
  {
    id: "screening",
    group: "upwork",
    label: "Screening questions",
    description: "Answers to the client's questions, each ready to paste in its box.",
    fields: [JOB, QUESTIONS, EXTRA],
  },
  {
    id: "proposal",
    group: "upwork",
    label: "Cover letter + questions",
    description: "The whole proposal at once: the letter and every answer.",
    fields: [JOB, QUESTIONS, EXTRA],
    choice: LENGTH,
  },
  {
    id: "interview",
    group: "other",
    label: "Interview prep",
    description: "The questions they're likely to ask on a call or in an interview, answered from my work.",
    fields: [
      { ...JOB, label: "Job post or role", placeholder: "Paste the Upwork post or the job description" },
      { ...EXTRA, placeholder: "e.g. it's a 30-minute call with the CTO; they asked about my timezone" },
    ],
  },
  {
    id: "reply",
    group: "upwork",
    label: "Reply to a client",
    description: "An answer to a message in Upwork chat: an invite, a question, a follow-up.",
    fields: [
      { id: "message", label: "Their message", placeholder: "Paste what the client wrote", required: true, rows: 5 },
      { id: "context", label: "The job, or where things stand", placeholder: "Optional: the job post, what was agreed so far…", rows: 3 },
      { id: "extra", label: "What I want to say", placeholder: "e.g. yes, I can do a call Thursday; my rate is $45/h", rows: 2 },
    ],
  },
  {
    id: "application",
    group: "other",
    label: "Job application letter",
    description: "A cover letter for a full-time or contract role: for an email, a careers page or LinkedIn.",
    fields: [
      { ...JOB, label: "Job description", placeholder: "Paste the role: title, company, requirements…" },
      { id: "company", label: "About the company", placeholder: "Optional: what they do, why I want to work there, who I'm writing to", rows: 2 },
      EXTRA,
    ],
    choice: {
      id: "format",
      label: "Format",
      options: [
        { id: "letter", label: "Letter", prompt: "a classic cover letter, about 250–350 words" },
        { id: "email", label: "Email", prompt: "the application email itself, with a subject line, about 150–200 words" },
        { id: "short", label: "Short note", prompt: "a short note for a form field or a LinkedIn message, under 120 words" },
      ],
    },
  },
  {
    id: "email",
    group: "other",
    label: "Email",
    description: "Any email: reaching out, following up, a thank-you after an interview, a reply.",
    fields: [
      { id: "to", label: "Who it's to", placeholder: "e.g. the CTO at Acme, a recruiter, a past client", required: true, rows: 1 },
      { id: "goal", label: "What it should say", placeholder: "e.g. follow up on my application from last week and mention the AgentFlow work", required: true, rows: 3 },
      { id: "thread", label: "Their email or the thread", placeholder: "Optional: paste what I'm replying to", rows: 3 },
    ],
    choice: {
      id: "tone",
      label: "Tone",
      options: [
        { id: "professional", label: "Professional", prompt: "professional and warm" },
        { id: "friendly", label: "Friendly", prompt: "friendly and relaxed" },
        { id: "brief", label: "Brief", prompt: "as short as it can be" },
      ],
    },
  },
];

export const TEMPLATE_GROUPS = [
  { id: "upwork", label: "Upwork" },
  { id: "other", label: "Applications and email" },
] as const;

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);

const fence = (text: string) => `"""\n${text.trim()}\n"""`;

/** The first message a filled template sends. Empty optional fields are left out. */
export function buildPrompt(template: Template, values: Record<string, string>, choice?: string): string {
  const option = template.choice?.options.find((o) => o.id === choice) ?? template.choice?.options[0];
  // "(short, under 120 words)", but "(professional and warm)" rather than "(professional, professional and warm)".
  const label = option?.label.toLowerCase();
  const detail = option && label ? (option.prompt.startsWith(label) ? option.prompt : `${label}, ${option.prompt}`) : null;
  const head = `Task: ${template.label}${detail ? ` (${detail})` : ""}`;
  const parts = [head];
  for (const f of template.fields) {
    const value = values[f.id]?.trim();
    if (value) parts.push(`${f.label}:\n${fence(value)}`);
  }
  return parts.join("\n\n");
}

/** Quick changes offered under the latest answer. */
export const FOLLOW_UPS = [
  "Make it shorter",
  "Sound more confident",
  "Lead with a different project",
  "End with a question for the client",
  "Less formal",
];

/** A chat's title from its first message: the task and the job's first line, or the message itself. */
export function titleFor(text: string): string {
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
  const task = /^Task: ([^(\n]+)/.exec(text)?.[1]?.trim();
  if (!task) return clip(clean(text), 70) || "New chat";
  // The first non-empty line inside the first quoted block: usually the job's title.
  const first = /"""\n([\s\S]*?)\n"""/.exec(text)?.[1]?.split("\n").map(clean).find(Boolean);
  return clip(first ? `${task} · ${first}` : task, 80);
}
