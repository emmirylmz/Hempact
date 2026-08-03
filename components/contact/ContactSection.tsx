"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { colors } from "@/lib/theme";
import { gsap, eases } from "@/lib/gsapConfig";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";
import { useContent, useLocale } from "@/lib/i18n/LocaleContext";

// The whole /iletisim page is this one section — no "scroll to explore"
// step, contact info is visible immediately below the fixed header.
export function ContactSection() {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLDListElement>(null);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useSceneBackgroundFlow(containerRef, colors.warmLinen);

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.set([eyebrowRef.current, headingRef.current, listRef.current, noteRef.current, ctaRef.current], {
        opacity: 0,
        y: 20,
      });
      gsap
        .timeline({ delay: 0.2 })
        .to(eyebrowRef.current, { opacity: 1, y: 0, duration: 0.6, ease: eases.fabric })
        .to(headingRef.current, { opacity: 1, y: 0, duration: 0.8, ease: eases.fabric }, "-=0.35")
        .to(listRef.current, { opacity: 1, y: 0, duration: 0.6, ease: eases.fabric }, "-=0.4")
        .to(noteRef.current, { opacity: 1, y: 0, duration: 0.6, ease: eases.fabric }, "-=0.3")
        .to(ctaRef.current, { opacity: 1, y: 0, duration: 0.5, ease: eases.fabric }, "-=0.3");
    },
    { scope: containerRef, dependencies: [reducedMotion] }
  );

  const { iletisim } = useContent();
  const locale = useLocale();

  return (
    <section
      ref={containerRef}
      // min-h-svh: see components/info/InfoHero.tsx's own comment — this
      // is a plain scrolling page, not a GSAP-pinned one, so a stable
      // (chrome-toggle-independent) viewport unit avoids a "jumpback"
      // reflow on a quick scroll-direction reversal.
      className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden px-6 py-32 text-center"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(closest-side, ${colors.mutedHemp}30, transparent 70%), radial-gradient(closest-side, ${colors.softClayRose}1c, transparent 75%)`,
        }}
        aria-hidden
      />
      <p ref={eyebrowRef} className="text-xs tracking-[0.3em] uppercase" style={{ color: colors.mutedCycleRed }}>
        {iletisim.eyebrow}
      </p>
      <h1
        ref={headingRef}
        className="mt-6 max-w-3xl text-4xl leading-tight font-light sm:text-5xl md:text-6xl"
        style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
      >
        {iletisim.heading}
      </h1>
      <dl ref={listRef} className="mt-10 flex flex-col gap-3">
        {iletisim.items.map((item) => (
          <div key={item.label} className="flex items-baseline justify-center gap-2 text-sm sm:text-base">
            <dt className="tracking-[0.1em] uppercase" style={{ color: colors.charcoal, opacity: 0.55 }}>
              {item.label}
            </dt>
            <dd style={{ color: colors.charcoal }}>
              {item.href ? (
                <a
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="underline decoration-transparent underline-offset-4 transition-colors hover:decoration-current"
                  style={{ color: colors.charcoal }}
                >
                  {item.value}
                </a>
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p
        ref={noteRef}
        className="mt-8 max-w-md text-base leading-relaxed font-light italic sm:text-lg"
        style={{ color: colors.deepHemp, fontFamily: "var(--font-display)" }}
      >
        {iletisim.note}
      </p>
      <Link
        ref={ctaRef}
        href={`/${locale}`}
        className="mt-10 rounded-full px-8 py-3 text-xs tracking-[0.2em] uppercase transition-transform hover:scale-105"
        style={{ backgroundColor: colors.deepHemp, color: colors.softIvory }}
      >
        {iletisim.cta}
      </Link>
    </section>
  );
}
