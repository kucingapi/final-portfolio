"use server";

import { updateTag } from "next/cache";
import { cookies } from "next/headers";
import { SESSION_COOKIE, validSession } from "@/lib/dashboard/auth";
import { describeChanges, type Change } from "@/lib/content/changes";
import { CONTENT_TAGS } from "@/lib/content/read";
import { isDocId, type DocId } from "@/lib/content/schema";
import {
  ContentError,
  changes,
  discardDraft,
  getState,
  publish,
  restore,
  saveDraft,
  versions,
  type DocState,
  type Issue,
  type Version,
} from "@/lib/content/store";

/**
 * The dashboard's Content view: load a document, save it as a draft, publish it, throw the draft away,
 * or bring back an earlier version. Publishing is the only step that changes the site, and it expires
 * the document's cache tag so the next visit renders the new copy. Each action checks the session.
 */

export type ContentView = { state: DocState; versions: Version[]; changes: Change[] };
export type ContentResult = { ok: true; view: ContentView } | { ok: false; error: string; issues?: Issue[]; view?: ContentView };

async function guard(doc: unknown): Promise<DocId> {
  if (!(await validSession((await cookies()).get(SESSION_COOKIE)?.value))) throw new ContentError("You're signed out. Sign in again.", 401);
  if (!isDocId(doc)) throw new ContentError("There's no such document.", 400);
  return doc;
}

async function view(doc: DocId): Promise<ContentView> {
  const [state, history, diff] = await Promise.all([getState(doc), versions(doc), changes(doc)]);
  return { state, versions: history, changes: describeChanges(diff.ops, diff.before, state.value) };
}

async function run(doc: unknown, step: (doc: DocId) => Promise<unknown>): Promise<ContentResult> {
  let id: DocId | undefined;
  try {
    id = await guard(doc);
    await step(id);
    return { ok: true, view: await view(id) };
  } catch (e) {
    if (!(e instanceof ContentError)) console.error("[content]", e);
    const error = e instanceof ContentError ? e.message : "Something went wrong. Try again.";
    const issues = e instanceof ContentError ? e.issues : undefined;
    // On a clash with another edit, hand back the latest so the editor can show it.
    const latest = id && e instanceof ContentError && e.status === 409 ? await view(id) : undefined;
    return { ok: false, error, issues, view: latest };
  }
}

export async function loadContent(doc: DocId) {
  return run(doc, async () => {});
}

export async function saveContent(doc: DocId, value: unknown, rev: number) {
  return run(doc, (d) => saveDraft(d, value, rev, "dashboard"));
}

export async function publishContent(doc: DocId, rev: number) {
  return run(doc, async (d) => {
    await publish(d, rev);
    updateTag(CONTENT_TAGS[d]);
  });
}

export async function discardContent(doc: DocId) {
  return run(doc, (d) => discardDraft(d));
}

export async function restoreContent(doc: DocId, version: number, rev: number) {
  return run(doc, (d) => restore(d, version, rev));
}
