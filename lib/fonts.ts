import { Fraunces, Inter } from "next/font/google";

// `subsets` in next/font/google only decides which files get a
// <link rel="preload">: the generated CSS always carries every subset Google
// serves for the family (vietnamese, latin-ext, latin), each with its own
// unicode-range, and the browser downloads a file only when the page uses a
// character in that range. "latin-ext" is preloaded alongside "latin"
// because Turkish (the site's default locale) needs it on every first
// screen: ğ/Ğ (U+011E-011F), ş/Ş (U+015E-015F) and İ (U+0130) are outside
// "latin"; ç/ö/ü and dotless ı (U+0131) are inside it.
//
// Fraunces and Inter are variable fonts: one file per style and subset covers
// the whole requested weight range (300-500), so the `weight` lists below
// cost no extra files. They stay as they are: font-light (300), normal (400)
// and font-medium (500) are all used, and font-semibold (600) resolves to
// the 500 end of the range exactly as before.
export const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  style: ["normal"],
});

// QC4 Q4-3: Fraunces italic used to be part of `display` above, so its two
// files (latin + latin-ext, ~86 KB) were preloaded on every page, although
// italic only appears in two subtitles far from any first screen
// (ContactSection, InfoSection). Same family, same italic files, now in a
// separate instance without preload, so they no longer compete with the
// first screen in the document head. app/globals.css points `--font-display`
// at this family on `.italic` elements, so `font-family:
// var(--font-display)` + `italic` renders the same Fraunces italic as before.
// The two pages with italic text (iletisim, hakkimizda) override
// `--font-display-italic` on their <main> with a preloaded instance of the
// same font; the nav prefetches those two routes only on intent
// (components/layout/IntentPrefetchLink.tsx), so their preloads don't run
// on other pages. This instance is the fallback for any other page.
export const displayItalic = Fraunces({
  variable: "--font-display-italic",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  style: ["italic"],
  preload: false,
});

export const body = Inter({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
});
