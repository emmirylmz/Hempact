import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { display, body } from "@/lib/fonts";
import { locales, isLocale, type Locale } from "@/lib/content";
import { LocaleProvider } from "@/lib/i18n/LocaleContext";
import { SITE_URL, buildMetadata } from "@/lib/seo";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const HOME_COPY: Record<Locale, { title: string; description: string }> = {
  tr: {
    title: "HEMPACT",
    description: "Doğada yetişti. Kadınlar için yeniden tasarlandı.",
  },
  en: {
    title: "HEMPACT",
    description: "Grown in nature. Redesigned for women.",
  },
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return { metadataBase: new URL(SITE_URL) };
  return {
    metadataBase: new URL(SITE_URL),
    ...buildMetadata({ locale: lang, path: "", ...HOME_COPY[lang] }),
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html lang={lang} className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <LocaleProvider locale={lang}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
