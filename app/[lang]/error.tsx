"use client";

import { useEffect } from "react";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { colors } from "@/lib/theme";
import { useContent, useLocale } from "@/lib/i18n/LocaleContext";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const content = useContent();
  const locale = useLocale();

  useEffect(() => {
    console.error(error);
  }, [error]);

  // Reuses notFound's copy — same tone, generic enough for either case, and
  // avoids adding a near-duplicate content section just for this fallback.
  const copy = content.notFound;

  return (
    <>
      <NavBar />
      <main
        // min-h-svh: see components/info/InfoHero.tsx's own comment.
        className="flex min-h-svh w-full flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: colors.warmLinen }}
      >
        <p className="text-xs tracking-[0.3em] uppercase" style={{ color: colors.mutedCycleRed }}>
          {locale === "tr" ? "Hata" : "Error"}
        </p>
        <h1
          className="mt-6 max-w-xl text-3xl leading-tight font-light sm:text-4xl"
          style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
        >
          {locale === "tr" ? "Bir şeyler ters gitti." : "Something went wrong."}
        </h1>
        <p className="mt-4 max-w-md text-sm font-light sm:text-base" style={{ color: colors.charcoal, opacity: 0.7 }}>
          {copy.message}
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-8 rounded-full px-8 py-3 text-xs tracking-[0.2em] uppercase transition-transform hover:scale-105"
          style={{ backgroundColor: colors.deepHemp, color: colors.softIvory }}
        >
          {locale === "tr" ? "Tekrar Dene" : "Try Again"}
        </button>
      </main>
      <Footer />
    </>
  );
}
