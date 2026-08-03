import { tr } from "./tr";
import { en } from "./en";

export const locales = ["tr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "tr";

// tr/en are both declared `as const`, so TypeScript infers literal string
// types for every value (e.g. "Hikâyemiz" rather than string) — comparing
// them directly would force every translation to match tr's exact wording.
// Widen collapses primitives back to their general type while preserving
// object/array shape (including tuple length and optional fields), so this
// still catches a missing key or wrong-shaped field between locales.
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends object
        ? { [K in keyof T]: Widen<T[K]> }
        : T;

export type Content = Widen<typeof tr>;

export const dictionaries: Record<Locale, Content> = { tr, en };

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getContent(locale: Locale): Content {
  return dictionaries[locale];
}
