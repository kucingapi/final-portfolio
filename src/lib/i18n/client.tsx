"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LANG, type Lang } from "./lang";
import type { Dict } from "./translate";
import { UI, type Ui } from "./ui";

/**
 * The page's language for client components, set once by SiteChrome. `names` translates the CV's
 * titles, skills and headlines, which a tailored link names in English (see localizeVariant).
 */

type Value = { lang: Lang; names: Dict };
const LangContext = createContext<Value>({ lang: DEFAULT_LANG, names: {} });

export function LangProvider({ lang, names, children }: Value & { children: ReactNode }) {
  return <LangContext.Provider value={{ lang, names }}>{children}</LangContext.Provider>;
}

export const useLang = (): Lang => useContext(LangContext).lang;
export const useUi = (): Ui => UI[useContext(LangContext).lang];
export const useNames = (): Dict => useContext(LangContext).names;
