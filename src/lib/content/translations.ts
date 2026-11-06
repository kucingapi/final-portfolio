import { sourceStrings, type Dict } from "@/lib/i18n/translate";
import { describePath } from "./changes";
import { SOURCE_DOCS, type SourceDocId } from "./schema";
import { getState, publishedValue, saveDraft, type Author, type DocState } from "./store";

/**
 * Working on the Bahasa translation (the `bahasa` document): which English strings it should cover, which
 * it does, and saving changes to it as a draft, like any other content. Server only.
 */

/**
 * One English string the translation should cover: where it first appears (a JSON Pointer, and in words,
 * "AgentFlow › Chapters › Day one › Title"), and its Bahasa if it has one.
 */
export type TranslationRow = { doc: SourceDocId; path: string; where: string; en: string; id?: string };

/**
 * Every string of the English documents (the draft where there is one, so a new line can be translated
 * before it is published), each once, in the site's order, with its translation.
 */
export async function translationRows(): Promise<{ state: DocState<"bahasa">; rows: TranslationRow[] }> {
  const [state, ...sources] = await Promise.all([getState("bahasa"), ...SOURCE_DOCS.map((d) => getState(d))]);
  const dict = state.value.strings;
  const seen = new Set<string>();
  const rows: TranslationRow[] = [];
  SOURCE_DOCS.forEach((doc, i) => {
    for (const s of sourceStrings(sources[i].value)) {
      if (seen.has(s.text)) continue;
      seen.add(s.text);
      rows.push({ doc, path: s.path, where: describePath(sources[i].value, s.path), en: s.text, id: dict[s.text] });
    }
  });
  return { state, rows };
}

/** The English strings any version of the documents uses, published or draft. */
export async function liveStrings(): Promise<Set<string>> {
  const values = await Promise.all(SOURCE_DOCS.flatMap((d) => [publishedValue(d), getState(d).then((s) => s.value)]));
  return new Set(values.flatMap((v) => sourceStrings(v).map((s) => s.text)));
}

/**
 * Set some translations (an empty one removes it) and save the result as the Bahasa draft. Translations
 * of English no version of the documents uses any more are dropped on the way, so the list stays the
 * size of the site. `rev` is the Bahasa document's revision the change started from.
 */
export async function saveTranslations(changes: Dict, rev: number, by: Author): Promise<DocState<"bahasa">> {
  const [state, live] = await Promise.all([getState("bahasa"), liveStrings()]);
  const next: Dict = { ...state.value.strings };
  for (const [en, id] of Object.entries(changes)) {
    if (id.trim()) next[en] = id.trim();
    else delete next[en];
  }
  for (const en of Object.keys(next)) if (!live.has(en)) delete next[en];
  return saveDraft("bahasa", { strings: next }, rev, by);
}

/** The Bahasa document as the dashboard saves it, without empty lines or translations of English no longer used. */
export async function tidyBahasa(value: unknown): Promise<unknown> {
  const strings = (value as { strings?: unknown } | null)?.strings;
  if (!strings || typeof strings !== "object") return value;
  const live = await liveStrings();
  const kept = Object.entries(strings as Record<string, unknown>).filter(([en, id]) => typeof id === "string" && id.trim() && live.has(en));
  return { ...(value as object), strings: Object.fromEntries(kept.map(([en, id]) => [en, (id as string).trim()])) };
}
