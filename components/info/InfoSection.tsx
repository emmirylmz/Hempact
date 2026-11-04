"use client";

import { useRef } from "react";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useLazySceneBackgroundFlow } from "@/lib/lazyGsap";
import { useInfoReveal } from "./useInfoReveal";
import { INFO_ICONS, StatRingIcon } from "./icons";

export type InfoSectionData = {
  id: string;
  eyebrow: string;
  heading: string;
  paragraphs: readonly string[];
  pullQuote: string;
  icon: string;
  stat?: { value: string; label: string };
};

export function InfoSection({ data, index, bgColor }: { data: InfoSectionData; index: number; bgColor: string }) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useLazySceneBackgroundFlow(containerRef, bgColor);
  useInfoReveal({ container: containerRef, icon: iconRef, body: bodyRef }, reducedMotion);

  const reverse = index % 2 === 1;
  const Icon = INFO_ICONS[data.icon as keyof typeof INFO_ICONS];
  const percent = data.stat ? Number(data.stat.value.replace(/[^0-9]/g, "")) : undefined;

  return (
    <section
      id={data.id}
      ref={containerRef}
      // min-h-svh: see InfoHero.tsx's own comment — this page stacks
      // several full-height sections in plain document flow, so a stable
      // (chrome-toggle-independent) viewport unit avoids the "jumpback"
      // reflow `dvh` would cause here.
      className="relative flex min-h-svh w-full items-center overflow-hidden px-6 py-24 md:px-10"
    >
      <div
        className={`relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center gap-12 md:gap-20 ${
          reverse ? "md:flex-row-reverse" : "md:flex-row"
        }`}
      >
        <div ref={iconRef} className="flex shrink-0 flex-col items-center gap-6 text-center md:w-56">
          <div className="relative flex h-40 w-40 items-center justify-center md:h-48 md:w-48">
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{ background: `radial-gradient(circle, ${colors.mutedCycleRed}30 0%, transparent 72%)` }}
              aria-hidden
            />
            <div className="relative h-[68%] w-[68%]">
              {data.icon === "stat" && percent !== undefined && data.stat ? (
                <StatRingIcon percent={percent} label={data.stat.value} />
              ) : Icon ? (
                <Icon />
              ) : null}
            </div>
          </div>
          <p className="text-xs tracking-[0.25em] uppercase" style={{ color: colors.mutedCycleRed, opacity: 0.85 }}>
            {data.eyebrow}
          </p>
        </div>

        <div ref={bodyRef} className="max-w-xl text-center md:text-left">
          <h2
            className="text-3xl leading-tight font-light sm:text-4xl md:text-5xl"
            style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
          >
            {data.heading}
          </h2>
          <div className="mt-6 space-y-4">
            {data.paragraphs.map((paragraph) => (
              <p
                key={paragraph}
                className="text-sm leading-relaxed font-light sm:text-base"
                style={{ color: colors.charcoal, opacity: 0.8 }}
              >
                {paragraph}
              </p>
            ))}
          </div>
          {data.stat && (
            <p className="mt-6 text-sm font-medium" style={{ color: colors.mutedCycleRed }}>
              {data.stat.label}
            </p>
          )}
          <p
            className="mt-8 text-lg leading-snug font-light italic sm:text-xl"
            style={{ color: colors.deepHemp, fontFamily: "var(--font-display)" }}
          >
            {data.pullQuote}
          </p>
        </div>
      </div>
    </section>
  );
}
