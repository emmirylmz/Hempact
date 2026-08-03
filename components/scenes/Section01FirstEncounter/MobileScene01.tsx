"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { primeMobileVideo, scrubVideoToProgress } from "@/lib/useMobileVideoScrub";
import { useSection01Timeline } from "./useSection01Timeline";
import { TriToneBackground } from "./TriToneBackground";

// Mobile-only rendering of Section01, hosted inside MobileStageRunA (see
// components/scroll/MobileStage.tsx) instead of owning its own independent
// GSAP pin — the stage hands this scene its own 0–1 progress through
// `onProgressRef.current`, called on every scroll tick, which is exactly what
// this section's own (now no-op on mobile) useSection01VideoScrub used to
// compute from its own ScrollTrigger. The one-time entrance reveal
// (useSection01Timeline — image blur-in, words fading up) is unrelated to
// scroll position and still runs exactly as it does on desktop.
export function MobileScene01({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wordRefs = useRef<HTMLSpanElement[]>([]);
  const subheadingRef = useRef<HTMLParagraphElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);

  useSection01Timeline(
    { container: containerRef, image: imageRef, words: wordRefs, subheading: subheadingRef, scrollCue: scrollCueRef },
    reducedMotion
  );

  // Priming: without this, iOS Safari (and some other WebKit builds) can
  // silently accept `currentTime` assignments on a video that's never
  // actually been played — position updates internally but no frame ever
  // paints, which looks identical to "the video isn't there." This was
  // missing here (unlike every other MobileSceneNN.tsx) and is the root
  // cause of a real "Section01-04 videos not visible on mobile" report.
  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) primeMobileVideo(videoEl);
  }, []);

  // Assigned in an effect, not directly in the render body, per this
  // project's React Compiler lint rules (see
  // [[eslint_react_compiler_immutability]]) — no deps array, so it stays
  // fresh every render.
  useEffect(() => {
    onProgressRef.current = (localProgress: number) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;
      scrubVideoToProgress(videoEl, localProgress);
    };
  });

  const { section01 } = useContent();
  const words = section01.heading.split(" ");

  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      // pt-28 + [justify-content:safe_center]: the same standard top-
      // clearance pattern every MobileSceneNN.tsx now uses (previously
      // inconsistent — some had pt-16, less than the header's own ~72px
      // height, others had plain justify-center with no clearance at
      // all — both let headings render under/behind the fixed header on
      // some viewport heights). pt-28 (112px) matches this site's own
      // established value (used by every desktop section's own top
      // padding); `safe center` vertically centers content when it fits
      // but falls back to the padded top edge instead of overflowing
      // above it when it doesn't — the mechanism that keeps this correct
      // across different phones' viewport heights, not just the one this
      // was tuned against.
      className="relative flex h-full w-full flex-col items-center overflow-hidden px-6 pt-28 pb-8 [justify-content:safe_center]"
    >
      <TriToneBackground />

      <div ref={imageRef} className="relative z-10 mb-8 w-full max-w-xl px-10">
        <div
          className="pointer-events-none absolute inset-0 -z-10 scale-[1.9]"
          style={{
            background: `linear-gradient(90deg, ${colors.paleHemp} 0%, ${colors.deepHemp} 100%)`,
            filter: "blur(60px)",
            opacity: 0.9,
          }}
          aria-hidden
        />
        <div className="relative w-full" style={{ aspectRatio: "1280 / 720" }}>
          {/* `<source media>` instead of a plain `src` — the reverse of
              Section01FirstEncounter.tsx's own fix: this scene's `md:hidden`
              wrapper only removes it from *layout* at `md:`+, it doesn't
              stop the browser's HTML parser from eagerly fetching a `src`
              it finds in the raw markup. Confirmed via the built HTML
              output: this file's own video had no gating at all, so a
              *desktop* visit was downloading this mobile-only copy too, on
              top of the (correctly gated) desktop copy — full reverse of
              the original bug. `(max-width: 767.98px)` is the exact
              complement of the desktop copy's `(min-width: 768px)`, no
              overlap or gap at the boundary. See
              [[mobile_unified_stage_architecture]]. */}
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            aria-label={section01.imageAlt}
            className="h-full w-full object-contain"
            style={{
              maskImage: "radial-gradient(ellipse closest-side at 50% 52%, black 70%, transparent 92%)",
              WebkitMaskImage: "radial-gradient(ellipse closest-side at 50% 52%, black 70%, transparent 92%)",
            }}
          >
            <source src="/images/hero-plant-growth.mp4" media="(max-width: 767.98px)" />
          </video>
        </div>
      </div>

      <h1
        className="relative z-10 max-w-3xl text-center text-3xl leading-tight font-light"
        style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
      >
        {words.map((word, index) => (
          <span key={index}>
            <span
              ref={(el) => {
                if (el) wordRefs.current[index] = el;
              }}
              className="inline-block"
            >
              {word}
            </span>{" "}
          </span>
        ))}
      </h1>

      <p
        ref={subheadingRef}
        className="relative z-10 mx-auto mt-5 max-w-md text-center text-sm font-light"
        style={{ color: colors.deepHemp }}
      >
        {section01.subheading}
      </p>

      <div
        ref={scrollCueRef}
        className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-[11px] tracking-[0.3em] uppercase"
        style={{ color: colors.charcoal }}
      >
        {section01.scrollCue}
      </div>
    </div>
  );
}
