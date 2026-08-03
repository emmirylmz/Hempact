import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SmoothScrollProvider } from "@/components/scroll/SmoothScrollProvider";
import { BackgroundFlow } from "@/components/scroll/BackgroundFlow";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { colors } from "@/lib/theme";
import { isLocale, type Locale } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { ContactSection } from "@/components/contact/ContactSection";

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
    <SmoothScrollProvider>
      <BackgroundFlow initialColor={colors.warmLinen} />
      <NavBar />
      <main>
        <ContactSection />
      </main>
      <Footer />
    </SmoothScrollProvider>
  );
}
