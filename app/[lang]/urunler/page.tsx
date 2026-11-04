import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubpageScrollProvider } from "@/components/scroll/SubpageScrollProvider";
import { BackgroundFlow } from "@/components/scroll/BackgroundFlow";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { colors } from "@/lib/theme";
import { isLocale, type Locale } from "@/lib/content";
import { buildMetadata } from "@/lib/seo";
import { ProductsGrid } from "@/components/products/ProductsGrid";

const COPY: Record<Locale, { title: string; description: string }> = {
  tr: {
    title: "Ürünler — Hempact",
    description: "Hempact'in kenevir lifinden geliştirilen ped ailesi: günlük, gece ve ince günlük ped.",
  },
  en: {
    title: "Products — Hempact",
    description: "Hempact's hemp-fiber pad family: daily, night, and daily thin pads.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return buildMetadata({ locale: lang, path: "/urunler", ...COPY[lang] });
}

export default async function UrunlerPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <SubpageScrollProvider>
      <BackgroundFlow initialColor={colors.warmLinen} />
      <NavBar />
      <main>
        <ProductsGrid />
      </main>
      <Footer />
    </SubpageScrollProvider>
  );
}
