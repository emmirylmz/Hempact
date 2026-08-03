"use client";

import { createContext, useContext } from "react";
import { getContent, type Locale } from "@/lib/content";

type ContentDict = ReturnType<typeof getContent>;

const LocaleContext = createContext<{ locale: Locale; content: ContentDict } | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const content = getContent(locale);
  return <LocaleContext.Provider value={{ locale, content }}>{children}</LocaleContext.Provider>;
}

function useLocaleContext() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale/useContent must be used within a LocaleProvider");
  return ctx;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}

export function useContent(): ContentDict {
  return useLocaleContext().content;
}
