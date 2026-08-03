"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { primeMobileVideo, scrubVideoToProgress } from "@/lib/useMobileVideoScrub";
import { useScrollToSection } from "@/components/scroll/SmoothScrollProvider";
import { useSection12Timeline } from "./useSection12Timeline";

// Mobile-only rendering of Section12, hosted inside MobileStageRunC (see
// components/scroll/MobileStage.tsx) — the sole scene in this run, last
// section on the page. Reuses useSection12Timeline as-is (its own
// "top 70%" toggle reveal isn't scroll-scrub-tied, so it works unchanged
// with its own fresh refs here, same as MobileScene01.tsx reusing
// useSection01Timeline).
export function MobileScene12({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subheadingRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const scrollToSection = useScrollToSection();
  const { section12 } = useContent();

  useSection12Timeline(
    { container: containerRef, image: imageRef, ring: ringRef, heading: headingRef, subheading: subheadingRef, cta: ctaRef },
    reducedMotion
  );

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) primeMobileVideo(videoEl);
  }, []);

  useEffect(() => {
    onProgressRef.current = (localProgress: number) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;
      scrubVideoToProgress(videoEl, localProgress);
    };
  });

  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      // pt-28 + [justify-content:safe_center]: see MobileScene01.tsx's
      // own comment on this pattern (was plain justify-center, no top
      // clearance).
      className="relative flex h-full w-full flex-col items-center overflow-hidden px-6 pt-28 pb-8 [justify-content:safe_center]"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(closest-side, ${colors.mutedHemp}30, transparent 70%), radial-gradient(closest-side, ${colors.softClayRose}1c, transparent 75%)`,
        }}
        aria-hidden
      />

      <div ref={imageRef} className="relative z-10 mb-8">
        <div
          className="pointer-events-none absolute inset-0 -z-10 scale-125"
          style={{
            background: `radial-gradient(ellipse 62% 58% at 50% 52%, ${colors.mistSage}80 0%, ${colors.paleHemp}55 45%, transparent 75%)`,
            filter: "blur(24px)",
          }}
          aria-hidden
        />
        <svg viewBox="0 0 340 340" width="340" height="340" className="pointer-events-none absolute -inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)]" aria-hidden>
          <circle ref={ringRef} cx="170" cy="170" r="160" fill="none" stroke={colors.mutedCycleRed} strokeWidth="2" />
        </svg>
        {/* `<source media>` instead of a plain `src` — see
            MobileScene01.tsx's own comment. */}
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          aria-label={section12.imageAlt}
          className="h-[38dvh] w-auto object-contain"
          style={{
            maskImage: "radial-gradient(ellipse closest-side at 50% 50%, black 68%, transparent 90%)",
            WebkitMaskImage: "radial-gradient(ellipse closest-side at 50% 50%, black 68%, transparent 90%)",
            filter: `drop-shadow(0 26px 30px ${colors.charcoal}30) drop-shadow(0 8px 10px ${colors.charcoal}20)`,
          }}
        >
          <source src="/images/ss1.mp4" media="(max-width: 767.98px)" />
        </video>
      </div>

      <h2
        ref={headingRef}
        className="relative z-10 max-w-2xl text-center text-3xl leading-tight font-light"
        style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
      >
        {section12.heading}
      </h2>
      <p ref={subheadingRef} className="relative z-10 mx-auto mt-5 max-w-md text-center text-sm font-light" style={{ color: colors.deepHemp }}>
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
    </div>
  );
}
