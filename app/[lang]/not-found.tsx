"use client";

import Link from "next/link";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { colors } from "@/lib/theme";
import { useContent, useLocale } from "@/lib/i18n/LocaleContext";

export default function NotFound() {
  const content = useContent();
  const locale = useLocale();

  return (
    <>
      <NavBar />
      <main
        // min-h-svh: see components/info/InfoHero.tsx's own comment.
        className="flex min-h-svh w-full flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: colors.warmLinen }}
      >
        <p className="text-xs tracking-[0.3em] uppercase" style={{ color: colors.mutedCycleRed }}>
          {content.notFound.eyebrow}
        </p>
        <h1
          className="mt-6 max-w-xl text-3xl leading-tight font-light sm:text-4xl"
          style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
        >
          {content.notFound.heading}
        </h1>
        <p className="mt-4 max-w-md text-sm font-light sm:text-base" style={{ color: colors.charcoal, opacity: 0.7 }}>
          {content.notFound.message}
        </p>
        <Link
          href={`/${locale}`}
          className="mt-8 rounded-full px-8 py-3 text-xs tracking-[0.2em] uppercase transition-transform hover:scale-105"
          style={{ backgroundColor: colors.deepHemp, color: colors.softIvory }}
        >
          {content.notFound.cta}
        </Link>
      </main>
      <Footer />
    </>
  );
}
