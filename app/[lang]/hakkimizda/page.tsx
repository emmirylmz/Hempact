import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { notFound } from "next/navigation";
import { SubpageScrollProvider } from "@/components/scroll/SubpageScrollProvider";
import { BackgroundFlow } from "@/components/scroll/BackgroundFlow";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { colors } from "@/lib/theme";
import { getContent, isLocale, type Locale } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { InfoHero } from "@/components/info/InfoHero";
import { InfoSection } from "@/components/info/InfoSection";
import { InfoClosing } from "@/components/info/InfoClosing";

// QC4 Q4-3: same preloaded Fraunces italic instance as app/[lang]/iletisim/
// page.tsx (identical settings, so the same font file URLs). This page has
// italic display text (InfoSection); resolving `.italic` to this instance
// here keeps the page from also downloading the layout-level, non-preloaded
// copy of the same font (lib/fonts.ts `displayItalic`), which would be a
// second download once the user moves on to /iletisim. QC5 Q5-1: the nav
// prefetches this page and /iletisim only on intent (components/layout/
// IntentPrefetchLink.tsx), so these preloads no longer leak to other pages.
const displayItalicPreloaded = Fraunces({
  variable: "--font-display-italic",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  style: ["italic"],
});

const COPY: Record<Locale, { title: string; description: string }> = {
  tr: {
    title: "Biz Kimiz — Hempact",
    description: "Hempact'in hikayesi: kenevir ve regl tabularını neden yıktığımız, regl yoksulluğu ve Hempactly olmanın anlamı.",
  },
  en: {
    title: "Who We Are — Hempact",
    description: "Hempact's story: why we're breaking the hemp and period taboos, period poverty, and what it means to be Hempactly.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return buildMetadata({ locale: lang, path: "/hakkimizda", ...COPY[lang] });
}

// Light/medium tones only, matching the home page's own convention (see
// each Section0X's own useSceneBackgroundFlow call) — deepHemp and
// mutedCycleRed are reserved for text/accent use across the whole site,
// never as a full-bleed flow color, because the body copy stays in
// charcoal and needs a light-to-medium backdrop to stay readable.
const SECTION_COLORS = [colors.paleHemp, colors.mutedHemp, colors.softClayRose, colors.mistSage, colors.paleHemp];

export default async function HakkimizdaPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const content = getContent(lang);

  return (
    <SubpageScrollProvider>
      <BackgroundFlow initialColor={colors.warmLinen} />
      <NavBar />
      <main className={displayItalicPreloaded.variable}>
        <InfoHero hero={content.hakkimizda.hero} />
        {content.hakkimizda.sections.map((section, index) => (
          <InfoSection key={section.id} data={section} index={index} bgColor={SECTION_COLORS[index] ?? colors.paleHemp} />
        ))}
        <InfoClosing closing={content.hakkimizda.closing} ctaHref={`/${lang}#section-11-product-family`} />
      </main>
      <Footer />
    </SubpageScrollProvider>
  );
}
