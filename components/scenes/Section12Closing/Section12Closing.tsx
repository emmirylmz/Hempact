"use client";

import { useRef } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useIsMobile } from "@/lib/useIsMobile";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";
import { useLazyVideoSource } from "@/lib/useLazyVideoSource";
import media from "@/public/images/v2/manifest.json";
import { useScrollToSection } from "@/components/scroll/scrollContext";
import { useSection12Timeline } from "./useSection12Timeline";
import { useSection12VideoScrub } from "./useSection12VideoScrub";

export function Section12Closing() {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subheadingRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const scrollToSection = useScrollToSection();
  const isVideoNear = useLazyVideoSource(containerRef, videoRef);

  // Disabled on mobile — see Section01FirstEncounter's own comment on
  // this pattern; this section's mobile rendering now lives inside
  // MobileStageRunC (MobileScene12.tsx).
  useSceneBackgroundFlow(containerRef, colors.warmLinen, !isMobile);
  useSection12Timeline(
    { container: containerRef, image: imageRef, ring: ringRef, heading: headingRef, subheading: subheadingRef, cta: ctaRef },
    reducedMotion,
    !isMobile
  );
  // Grows through the field footage as the reader scrolls, same pattern as
  // Section01's hero clip — desktop only (see the hook for the mobile/
  // reduced-motion fallback).
  useSection12VideoScrub({ container: containerRef, video: videoRef }, reducedMotion, isMobile);

  const { section12 } = useContent();

  // hidden md:contents: see Section01FirstEncounter's own comment on this
  // pattern.
  return (
    <div className="hidden md:contents">
    <section
      id="section-12-closing"
      ref={containerRef}
      // z-[2]: see Section01FirstEncounter's own comment on this pattern
      // (lowest of all 12 — last section, nothing after it to outrank).
      className="relative z-[2] flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden px-6 py-24 md:py-16"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(closest-side, ${colors.mutedHemp}30, transparent 70%), radial-gradient(closest-side, ${colors.softClayRose}1c, transparent 75%)`,
        }}
        aria-hidden
      />

      <div ref={imageRef} className="relative z-10 mb-8">
        {/* A soft green echo (mistSage/paleHemp, matching the field
            footage's own dominant tones) behind the mask, same trick
            Section01 uses for its own hero clip — see the video's mask
            comment below for why this is what actually sells the "no video
            frame" illusion rather than the blur alone. */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 scale-125"
          aria-hidden
        >
          {/* Was the same gradient + `filter: blur()`. Now pre-softened:
              extra stops follow the blurred profile (slightly lower peak,
              Gaussian tail), on a box grown 25% per side so the tail never
              meets an edge. Static paint, no per-frame GPU blur (bulgu #10). */}
          <div className="absolute -inset-[25%]" style={{ background: `radial-gradient(ellipse 41.33% 38.67% at 50% 51.33%, ${colors.mistSage}80 0%, ${colors.paleHemp}55 45%, ${colors.paleHemp}2b 60%, ${colors.paleHemp}0b 75%, ${colors.paleHemp}02 84%, transparent 93%)` }} />
        </div>
        <svg viewBox="0 0 340 340" width="340" height="340" className="pointer-events-none absolute -inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)]" aria-hidden>
          <circle ref={ringRef} cx="170" cy="170" r="160" fill="none" stroke={colors.mutedCycleRed} strokeWidth="2" />
        </svg>
        {/* No card, border, or shadow around the video itself — same
            approach as Section01's hero clip (see that component's own
            comment): `closest-side` guarantees the mask reaches full
            transparency before the video's own rectangular edge on any
            aspect ratio, so there's never a hard "video frame" line, only
            a soft fade into the glow above and the page beyond it. */}
        {/* `<source media>` instead of a plain `src` — see
            Section01FirstEncounter.tsx's own comment (prevents a real
            double-bandwidth mobile bug). */}
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          poster={isVideoNear ? media.ss1.poster : undefined}
          aria-label={section12.imageAlt}
          className="h-[38dvh] w-auto object-contain md:h-[44dvh]"
          // No `filter: drop-shadow()` (bulgu #10): filter is applied
          // before the mask, the mask clips everything outside the video's
          // own box, and inside it the opaque footage covers the shadow —
          // it was never visible, only a per-frame filter pass on a
          // scrubbing video. The poster also gives this `w-auto` box its
          // real 16:9 width before metadata arrives (previously 300x150).
          style={{
            maskImage: "radial-gradient(ellipse closest-side at 50% 50%, black 68%, transparent 90%)",
            WebkitMaskImage: "radial-gradient(ellipse closest-side at 50% 50%, black 68%, transparent 90%)",
          }}
        >
          {isVideoNear && <source src={media.ss1.desktop} media="(min-width: 768px)" />}
        </video>
      </div>

      <h2
        ref={headingRef}
        className="relative z-10 max-w-2xl text-center text-3xl leading-tight font-light sm:text-4xl md:text-5xl"
        style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
      >
        {section12.heading}
      </h2>
      <p ref={subheadingRef} className="relative z-10 mx-auto mt-5 max-w-md text-center text-sm font-light sm:text-base" style={{ color: colors.deepHemp }}>
        {section12.subheading}
      </p>
      <button
        ref={ctaRef}
        type="button"
        onClick={() => scrollToSection("section-11-product-family")}
        className="relative z-10 mt-8 rounded-full px-8 py-3 text-xs tracking-[0.2em] uppercase transition-transform hover:scale-105"
        style={{ backgroundColor: colors.deepHemp, color: colors.softIvory }}
      >
        {section12.cta}
      </button>
    </section>
    </div>
  );
}
