"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { useContent, useLocale } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { gsap, eases } from "@/lib/gsapConfig";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";

const ACCENTS = [colors.mutedHemp, colors.deepHemp, colors.softClayRose];

// The whole /urunler page is this one section: heading and product cards
// are visible together immediately below the fixed header — no "scroll to
// explore" step before reaching the products.
export function ProductsGrid() {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useSceneBackgroundFlow(containerRef, colors.softIvory);

  useGSAP(
    () => {
      if (reducedMotion) return;
      const cards = cardRefs.current.filter((card): card is HTMLDivElement => card !== null);
      gsap.set([eyebrowRef.current, headingRef.current, ...cards, noteRef.current, ctaRef.current], {
        opacity: 0,
        y: 20,
      });
      gsap
        .timeline({ delay: 0.2 })
        .to(eyebrowRef.current, { opacity: 1, y: 0, duration: 0.6, ease: eases.fabric })
        .to(headingRef.current, { opacity: 1, y: 0, duration: 0.8, ease: eases.fabric }, "-=0.35")
        .to(cards, { opacity: 1, y: 0, duration: 0.6, ease: eases.fabric, stagger: 0.1 }, "-=0.4")
        .to(noteRef.current, { opacity: 1, y: 0, duration: 0.5, ease: eases.fabric }, "-=0.2")
        .to(ctaRef.current, { opacity: 1, y: 0, duration: 0.5, ease: eases.fabric }, "-=0.3");
    },
    { scope: containerRef, dependencies: [reducedMotion] }
  );

  const { urunler, section11, productLabels } = useContent();
  const locale = useLocale();

  return (
    <section
      id="section-urunler-grid"
      ref={containerRef}
      className="relative flex w-full flex-col items-center justify-center px-6 py-28 text-center"
    >
      <p ref={eyebrowRef} className="text-xs tracking-[0.3em] uppercase" style={{ color: colors.mutedCycleRed }}>
        {urunler.eyebrow}
      </p>
      <h1
        ref={headingRef}
        className="mt-6 max-w-2xl text-3xl leading-tight font-light sm:text-4xl md:text-5xl"
        style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
      >
        {urunler.heading}
      </h1>

      <div className="relative z-10 mt-14 grid w-full max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
        {section11.products.map((product, index) => (
          <div
            key={product.name}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            className="group flex flex-col overflow-hidden rounded-3xl border text-left transition-transform duration-300 hover:-translate-y-1 hover:rotate-1"
            style={{ borderColor: `${ACCENTS[index]}55`, backgroundColor: colors.warmLinen }}
          >
            <div
              className="relative flex h-56 items-center justify-center overflow-hidden p-6"
              style={{ background: `radial-gradient(closest-side, ${ACCENTS[index]}75, ${colors.warmLinen} 78%)` }}
            >
              <Image
                src="/images/pad-cutout.png"
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-contain p-8 transition-transform duration-500 group-hover:scale-105"
                style={{ filter: `drop-shadow(0 14px 18px ${colors.charcoal}45) drop-shadow(0 4px 6px ${colors.charcoal}30)` }}
              />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-6">
              <h3 className="text-lg font-medium" style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}>
                {product.name}
              </h3>
              <dl className="grid grid-cols-2 gap-y-1 text-xs" style={{ color: colors.charcoal, opacity: 0.75 }}>
                <dt className="opacity-60">{productLabels.size}</dt>
                <dd>{product.size}</dd>
                <dt className="opacity-60">{productLabels.pack}</dt>
                <dd>{product.pack}</dd>
                <dt className="opacity-60">{productLabels.use}</dt>
                <dd>{product.use}</dd>
                <dt className="opacity-60">{productLabels.surface}</dt>
                <dd>{productLabels.surfaceValue}</dd>
              </dl>
              {/* A status badge ("Yakında"/"Coming Soon"), not a real
                  control — see Section11ProductFamily.tsx's own comment
                  (a <button> with no click behavior is a keyboard/screen-
                  reader dead end). */}
              <span
                className="mt-auto rounded-full border px-4 py-2 text-xs tracking-[0.15em] uppercase"
                style={{ borderColor: ACCENTS[index], color: colors.charcoal }}
              >
                {product.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p ref={noteRef} className="mt-14 max-w-md text-base font-light" style={{ color: colors.charcoal, opacity: 0.7 }}>
        {urunler.closingNote}
      </p>
      <Link
        ref={ctaRef}
        href={`/${locale}/iletisim`}
        className="mt-6 rounded-full px-8 py-3 text-xs tracking-[0.2em] uppercase transition-transform hover:scale-105"
        style={{ backgroundColor: colors.deepHemp, color: colors.softIvory }}
      >
        {urunler.cta}
      </Link>
    </section>
  );
}
