"use client";

import { useRef } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useIsMobile } from "@/lib/useIsMobile";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";
import { useLazyVideoSource } from "@/lib/useLazyVideoSource";
import { useSection03Timeline } from "./useSection03Timeline";

export function Section03FiberInsideStem() {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Disabled on mobile — see Section01FirstEncounter's own comment on
  // this pattern; this section's mobile rendering now lives inside
  // MobileStageRunA (MobileScene03.tsx).
  useSceneBackgroundFlow(containerRef, colors.softIvory, !isMobile);
  useSection03Timeline({ container: containerRef, video: videoRef }, reducedMotion, isMobile);
  const isVideoNear = useLazyVideoSource(containerRef, videoRef);

  const { section03 } = useContent();

  // hidden md:contents: see Section01FirstEncounter's own comment on this
  // pattern.
  return (
    <div className="hidden md:contents">
    <section
      id="section-03-fiber-inside-stem"
      ref={containerRef}
      // z-[20]: see Section01FirstEncounter's own comment on this pattern.
      className="relative z-[20] flex min-h-dvh w-full flex-col items-center overflow-hidden px-6 pt-28 pb-12 md:pt-32"
    >
      <div className="relative z-10 mb-6 max-w-xl text-center md:mb-10">
        <h2
          className="text-3xl leading-tight font-light sm:text-4xl md:text-5xl"
          style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
        >
          {section03.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light sm:text-base" style={{ color: colors.deepHemp }}>
          {section03.subheading}
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center">
        <div className="relative w-full max-w-xl">
          {/* Same "glow echo" technique as Section01/Section02's footage: a
              heavily-blurred sweep sitting behind the clip, so the video's
              own true per-pixel transparency (see section3.webm —
              colorkeyed, not masked) reads as the cross-section floating in
              the section's own atmosphere rather than a rectangle of
              footage pasted on top of it. */}
          <div
            className="pointer-events-none absolute inset-0 -z-10 scale-150"
            style={{
              background: `radial-gradient(ellipse, ${colors.deepHemp}35, transparent 70%)`,
              filter: "blur(40px)",
            }}
            aria-hidden
          />
          {/* Single MP4, no WebM source anymore — the WebM's own claimed
              alpha channel (ALPHA_MODE:1 in the container) never actually
              decoded to real transparency in practice (verified via a raw
              decode: every sampled pixel came back fully opaque), so the
              two formats were just two copies of the same flat, wrongly
              colored studio backdrop rather than one true-alpha version
              and one matte fallback. This MP4 is now baked directly
              against softIvory (this section's own resting page
              background, see useSceneBackgroundFlow below) via an ffmpeg
              colorkey pass, the same "match the page, don't rely on live
              alpha" approach Section05/Section10 already use successfully
              — one file guarantees mobile and desktop render identically
              instead of depending on which format each browser decodes. */}
          {/* `<source media>` instead of a plain `src` — see
              Section01FirstEncounter.tsx's own comment (prevents a real
              double-bandwidth mobile bug: the browser's HTML parser
              otherwise fetches this desktop-only file even when it's
              never visible). */}
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            aria-label={section03.heading}
            className="relative w-full object-contain"
            style={{ aspectRatio: "1280 / 720" }}
          >
            {isVideoNear && <source src="/images/section3.mp4" media="(min-width: 768px)" />}
          </video>
        </div>
      </div>
    </section>
    </div>
  );
}
