import { lang } from "next/root-params";
import { langParam } from "./meta";
import type { Lang } from "./lang";

/** The language of the page being rendered, for server components anywhere under app/[lang]. */
export async function getLang(): Promise<Lang> {
  return langParam((await lang()) ?? "");
}
