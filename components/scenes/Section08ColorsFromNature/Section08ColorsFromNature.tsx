"use client";

import { useRef } from "react";
import Image from "next/image";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";
import { useSection08Timeline } from "./useSection08Timeline";

const ICONS = [
  { src: "/images/icon-hemp-leaf.png", tint: colors.mutedHemp, boxClass: "h-[66%] w-[66%]", imageClass: "opacity-85" },
  { src: "/images/pad-cutout.png", tint: colors.softIvory, boxClass: "h-[80%] w-[44%]", imageClass: "" },
  { src: "/images/icon-blood-drop.png", tint: colors.mutedCycleRed, boxClass: "h-[60%] w-[60%]", imageClass: "opacity-85" },
] as const;

export function Section08ColorsFromNature() {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);

  useSceneBackgroundFlow(containerRef, colors.paleHemp);
  useSection08Timeline({ container: containerRef, columns: columnRefs }, reducedMotion);

  const { section08 } = useContent();

  return (
    <section
      id="section-08-colors-from-nature"
      ref={containerRef}
      // z-[10]: see Section01FirstEncounter's own comment on this pattern.
      className="relative z-[10] flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-6 py-24 md:py-16"
    >
      <h2
        className="relative z-10 mb-14 max-w-2xl text-center text-3xl leading-tight font-light sm:text-4xl md:mb-16 md:text-5xl"
        style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
      >
        {section08.heading}
      </h2>

      <div className="relative z-10 grid w-full max-w-3xl grid-cols-1 gap-14 sm:grid-cols-3 sm:gap-8 md:gap-12">
        {section08.swatches.map((swatch, index) => {
          const icon = ICONS[index];
          return (
            <div
              key={swatch.name}
              ref={(el) => {
                columnRefs.current[index] = el;
              }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <div className="relative flex h-36 w-36 shrink-0 items-center justify-center sm:h-40 sm:w-40 md:h-48 md:w-48">
                <div
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{ background: `radial-gradient(circle, ${icon.tint}55 0%, ${icon.tint}00 72%)` }}
                  aria-hidden
                />
                <div className={`relative ${icon.boxClass}`}>
                  <Image
                    src={icon.src}
                    alt=""
                    fill
                    sizes="192px"
                    className={`object-contain ${icon.imageClass}`}
                    style={index === 1 ? { filter: `drop-shadow(0 12px 16px ${colors.charcoal}35)` } : undefined}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs tracking-[0.25em] uppercase" style={{ color: colors.mutedCycleRed, opacity: 0.85 }}>
                  {swatch.name}
                </p>
                <p className="mx-auto mt-2 max-w-[14rem] text-sm font-light" style={{ color: colors.charcoal }}>
                  {swatch.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
