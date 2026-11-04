import { applyPatch, createPatch, type Operation } from "rfc6902";
import { deleteValue, getValue, pushToList, readList, setValue } from "@/lib/dashboard/state";
import { redis } from "@/lib/kv";
import { DEFAULTS } from "./defaults";
import { CONTENT_DOCS, type DocContent, type DocId } from "./schema";

/**
 * Where the editable content lives. Each document (site, cv, projects) has a published copy, which the
 * site reads, and while it is being edited a draft, which only the dashboard and agents see. Until a
 * document is first published the site shows the copy bundled in src/content. Upstash in production,
 * .data/dashboard.json in development (see src/lib/dashboard/state.ts). Server only.
 *
 * Every save and publish gives the document a new revision, and every write names the revision it
 * started from, so an agent's edit can't silently undo yours or the other way round. Publishing keeps
 * the last 20 versions to go back to.
 *
 * Previews share production's database, so they keep their own copies: trying the editor on a preview
 * never changes the live site.
 */

const scope = process.env.VERCEL_ENV === "preview" ? "content:preview" : "content";
const key = (doc: DocId, part: string) => `${scope}:${doc}:${part}`;
const KEEP = 20;

export type Author = "dashboard" | "agent";
type Stored<D extends DocId> = { value: DocContent[D]; rev: number; at: string; by: Author };
export type Version = { rev: number; at: string; by: Author };

export type DocState<D extends DocId = DocId> = {
  doc: D;
  /** What editing starts from: the draft when there is one, otherwise the published copy. */
  value: DocContent[D];
  /** The revision to name in the next write. */
  rev: number;
  /** `at` is null while the site still shows the bundled copy. */
  published: { rev: number; at: string | null };
  draft: { at: string; by: Author } | null;
};

export type Issue = { path: string; message: string };

export class ContentError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly issues: Issue[] = [],
  ) {
    super(message);
  }
}

/** A JSON Pointer, as JSON Patch uses: ["projects", 2, "title"] → "/projects/2/title". */
export const pointer = (path: readonly PropertyKey[]) =>
  path.map((p) => "/" + String(p).replaceAll("~", "~0").replaceAll("/", "~1")).join("");

const label = (doc: DocId) => CONTENT_DOCS[doc].label;
const nextRev = (current: number) => Math.max(Date.now(), current + 1);

async function records<D extends DocId>(doc: D) {
  const [published, draft] = await Promise.all([
    getValue<Stored<D>>(key(doc, "published")),
    getValue<Stored<D>>(key(doc, "draft")),
  ]);
  return { published, draft };
}

function stateOf<D extends DocId>(doc: D, published: Stored<D> | null, draft: Stored<D> | null): DocState<D> {
  return {
    doc,
    value: draft?.value ?? published?.value ?? DEFAULTS[doc],
    rev: draft?.rev ?? published?.rev ?? 0,
    published: { rev: published?.rev ?? 0, at: published?.at ?? null },
    draft: draft ? { at: draft.at, by: draft.by } : null,
  };
}

/**
 * A production build with no database (run on a laptop without the Upstash variables) shows the bundled
 * copy rather than failing; nothing can be edited there. On Vercel the variables are set.
 */
const bundledOnly = () => !redis && process.env.NODE_ENV === "production";

/** What the public site shows. */
export async function publishedValue<D extends DocId>(doc: D): Promise<DocContent[D]> {
  if (bundledOnly()) return DEFAULTS[doc];
  return (await getValue<Stored<D>>(key(doc, "published")))?.value ?? DEFAULTS[doc];
}

/** What a preview of the draft shows: the draft when there is one. */
export async function draftValue<D extends DocId>(doc: D): Promise<DocContent[D]> {
  if (bundledOnly()) return DEFAULTS[doc];
  const { published, draft } = await records(doc);
  return stateOf(doc, published, draft).value;
}

export async function getState<D extends DocId>(doc: D): Promise<DocState<D>> {
  const { published, draft } = await records(doc);
  return stateOf(doc, published, draft);
}

function check<D extends DocId>(doc: D, value: unknown): DocContent[D] {
  const result = CONTENT_DOCS[doc].schema.safeParse(value);
  if (result.success) return result.data as DocContent[D];
  const issues = result.error.issues.map((i) => ({ path: pointer(i.path), message: i.message }));
  throw new ContentError(`Not saved: ${issues.length === 1 ? "one field needs" : `${issues.length} fields need`} fixing.`, 422, issues);
}

function conflict(doc: DocId, rev: number, current: number) {
  return new ContentError(
    `The ${label(doc)} content changed since revision ${rev} (it is now ${current}). Load it again and redo the change.`,
    409,
  );
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Save the whole document as the draft. `rev` is the revision the change started from. A draft that ends
 * up the same as the published copy is dropped, as there is then nothing to publish.
 */
export async function saveDraft<D extends DocId>(doc: D, value: unknown, rev: number, by: Author): Promise<DocState<D>> {
  const data = check(doc, value);
  const { published, draft } = await records(doc);
  const current = stateOf(doc, published, draft);
  if (rev !== current.rev) throw conflict(doc, rev, current.rev);
  if (same(data, published?.value ?? DEFAULTS[doc])) {
    if (draft) await deleteValue(key(doc, "draft"));
    return stateOf(doc, published, null);
  }
  const next: Stored<D> = { value: data, rev: nextRev(current.rev), at: new Date().toISOString(), by };
  await setValue(key(doc, "draft"), next);
  return stateOf(doc, published, next);
}

/** Apply RFC 6902 JSON Patch operations to the draft (or to the published copy when there is no draft). */
export async function patchDraft<D extends DocId>(doc: D, ops: Operation[], rev: number, by: Author): Promise<DocState<D>> {
  const current = await getState(doc);
  if (rev !== current.rev) throw conflict(doc, rev, current.rev);
  const value = structuredClone(current.value);
  const failed = applyPatch(value, ops)
    .map((error, i) => (error ? { path: ops[i].path, message: `Operation ${i} (${ops[i].op}): ${error.message}` } : null))
    .filter((x): x is Issue => Boolean(x));
  if (failed.length) throw new ContentError("The patch didn't apply; nothing was saved.", 422, failed);
  return saveDraft(doc, value, rev, by);
}

/** Publish the draft: the site shows it from the next visit. */
export async function publish<D extends DocId>(doc: D, rev: number): Promise<DocState<D>> {
  const draft = await getValue<Stored<D>>(key(doc, "draft"));
  if (!draft) throw new ContentError(`The ${label(doc)} content has no draft to publish.`, 409);
  if (rev !== draft.rev) throw conflict(doc, rev, draft.rev);
  const next: Stored<D> = { value: check(doc, draft.value), rev: nextRev(draft.rev), at: new Date().toISOString(), by: draft.by };

  const history = await readList<Version>(key(doc, "history"), KEEP);
  if (history.length >= KEEP) await deleteValue(key(doc, `v:${history[history.length - 1].rev}`));
  await setValue(key(doc, `v:${next.rev}`), next.value);
  await setValue(key(doc, "published"), next);
  await deleteValue(key(doc, "draft"));
  await pushToList(key(doc, "history"), { rev: next.rev, at: next.at, by: next.by } satisfies Version, KEEP);
  return stateOf(doc, next, null);
}

export async function discardDraft<D extends DocId>(doc: D): Promise<DocState<D>> {
  await deleteValue(key(doc, "draft"));
  return getState(doc);
}

/** Published versions, newest first. Revision 0, the bundled copy, is always there to go back to. */
export async function versions(doc: DocId): Promise<Version[]> {
  return readList<Version>(key(doc, "history"), KEEP);
}

/** Make an earlier version the draft, to look over and publish. */
export async function restore<D extends DocId>(doc: D, version: number, rev: number): Promise<DocState<D>> {
  const value = version === 0 ? DEFAULTS[doc] : await getValue<DocContent[D]>(key(doc, `v:${version}`));
  if (!value) throw new ContentError("That version is no longer kept.", 404);
  return saveDraft(doc, value, rev, "dashboard");
}

/** The draft's changes against the published copy, as JSON Patch operations. Empty without a draft. */
export async function changes(doc: DocId): Promise<{ ops: Operation[]; before: unknown }> {
  const { published, draft } = await records(doc);
  const before = published?.value ?? DEFAULTS[doc];
  return { ops: draft ? createPatch(before, draft.value) : [], before };
}
