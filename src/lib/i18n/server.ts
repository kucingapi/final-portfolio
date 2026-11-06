import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { isLang, type Lang } from "./lang";

/**
 * The language of the page being rendered, for server components anywhere under app/[lang]. The rewrite
 * in next.config.ts sends every page address to /en/… or /id/…, but the addresses it leaves alone
 * (/api, /go, /ID/…) still reach [lang] with a value that is no language: those are a 404, not English.
 */
export async function getLang(): Promise<Lang> {
  const value = await lang();
  if (!isLang(value)) notFound();
  return value;
}
