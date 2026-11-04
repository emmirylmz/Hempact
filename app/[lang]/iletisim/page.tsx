import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { notFound } from "next/navigation";
import { SubpageScrollProvider } from "@/components/scroll/SubpageScrollProvider";
import { BackgroundFlow } from "@/components/scroll/BackgroundFlow";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { colors } from "@/lib/theme";
import { isLocale, type Locale } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { ContactSection } from "@/components/contact/ContactSection";

// QC4 Q4-3: Fraunces italic is not preloaded in the document head sitewide
// (lib/fonts.ts), but this page shows italic display text on its first
// screen (ContactSection subtitle), so it is preloaded here: next/font
// preloads a font on the routes whose modules call it. Same settings as
// lib/fonts.ts `displayItalic`; the variable on <main> makes `.italic`
// (app/globals.css) resolve to this instance, so the non-preloaded copy is
// never requested here. A prefetch of this route runs these preloads on the
// page that prefetches it, so the nav prefetches it only on intent
// (components/layout/IntentPrefetchLink.tsx, QC5 Q5-1).
// app/[lang]/hakkimizda/page.tsx uses the same instance.
const displayItalicPreloaded = Fraunces({
  variable: "--font-display-italic",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  style: ["italic"],
});

const COPY: Record<Locale, { title: string; description: string }> = {
  tr: {
    title: "İletişim — Hempact",
    description: "Hempact ile iletişime geçin.",
  },
  en: {
    title: "Contact — Hempact",
    description: "Get in touch with Hempact.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return buildMetadata({ locale: lang, path: "/iletisim", ...COPY[lang] });
}

export default async function IletisimPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <SubpageScrollProvider>
      <BackgroundFlow initialColor={colors.warmLinen} />
      <NavBar />
      <main className={displayItalicPreloaded.variable}>
        <ContactSection />
      </main>
      <Footer />
    </SubpageScrollProvider>
  );
}
