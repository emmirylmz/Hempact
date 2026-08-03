import { Fraunces, Inter } from "next/font/google";

// "latin-ext" alongside "latin": Turkish (this site's primary/default
// locale) uses several Latin Extended-A letters — ğ/Ğ, ş/Ş, ı/İ — that
// the plain "latin" subset doesn't cover (checked the actual generated
// @font-face unicode-range: "latin" stops short of U+011F/U+015E-015F,
// only U+0131 dotless-ı happens to sneak in). Without "latin-ext", every
// ğ/ş/Ş in the site's own Turkish copy — "değil", "doğal", "üzerinde",
// "yaşam", dozens of headings — silently fell back to the browser's
// default system font for just those glyphs, a real, visible typography
// inconsistency in the primary locale, not merely a hypothetical gap.
export const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

export const body = Inter({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
});
