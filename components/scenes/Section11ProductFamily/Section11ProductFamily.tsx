"use client";

import { useRef } from "react";
import Image from "next/image";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";
import { useSection11Timeline } from "./useSection11Timeline";

const ACCENTS = [colors.mutedHemp, colors.deepHemp, colors.softClayRose];

export function Section11ProductFamily() {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useSceneBackgroundFlow(containerRef, colors.softIvory);
  useSection11Timeline(containerRef, cardRefs, reducedMotion);

  const { section11, productLabels } = useContent();

  return (
    <section
      id="section-11-product-family"
      ref={containerRef}
      // z-[4]: see Section01FirstEncounter's own comment on this pattern.
      className="relative z-[4] flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-6 py-24"
    >
      <h2
        className="relative z-10 mb-14 max-w-2xl text-center text-3xl leading-tight font-light sm:text-4xl md:mb-16 md:text-5xl"
        style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
      >
        {section11.heading}
      </h2>

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
        {section11.products.map((product, index) => (
          <div
            key={product.name}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            className="group flex flex-col overflow-hidden rounded-3xl border transition-transform duration-300 hover:-translate-y-1 hover:rotate-1"
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
                  control — no click behavior exists for it at all, so it's
                  a <span>, not a <button>. A `<button>` here would still
                  take keyboard focus and be announced as interactive by
                  screen readers, a dead end for anyone who activates it. */}
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
    </section>
  );
}
