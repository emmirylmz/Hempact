"use client";

import { useRef } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useIsMobile } from "@/lib/useIsMobile";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";
import { useLazyVideoSource } from "@/lib/useLazyVideoSource";
import media from "@/public/images/v2/manifest.json";
import { useSection04Timeline } from "./useSection04Timeline";

export function Section04FiberToSurface() {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Disabled on mobile — see Section01FirstEncounter's own comment on
  // this pattern; this section's mobile rendering now lives inside
  // MobileStageRunA (MobileScene04.tsx).
  useSceneBackgroundFlow(containerRef, colors.paleHemp, !isMobile);
  useSection04Timeline({ container: containerRef, video: videoRef }, reducedMotion, isMobile);
  const isVideoNear = useLazyVideoSource(containerRef, videoRef);

  const { section04 } = useContent();

  // hidden md:contents: see Section01FirstEncounter's own comment on this
  // pattern.
  return (
    <div className="hidden md:contents">
    <section
      id="section-04-fiber-to-surface"
      ref={containerRef}
      // z-[18]: see Section01FirstEncounter's own comment on this pattern.
      className="relative z-[18] flex min-h-dvh w-full flex-col items-center overflow-hidden px-6 pt-28 pb-12 md:pt-32"
    >
      <div className="relative z-10 mb-6 max-w-xl text-center md:mb-10">
        <h2
          className="text-3xl leading-tight font-light sm:text-4xl md:text-5xl"
          style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
        >
          {section04.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light sm:text-base" style={{ color: colors.deepHemp }}>
          {section04.subheading}
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center">
        {/* No added glow-echo div here unlike Section02/03 — this clip's
            own background vignette (a warm taupe spotlight) doesn't
            colorkey out to full transparency at every point without
            eating into the woven fabric's own shadow creases (see
            [[section04_fiber_video_integration]]), so the leftover soft
            glow already does that job; stacking the site's green-toned
            echo on top of it would just clash with its warm tone. This is
            the same reason the recolor below (see the video's own comment)
            uses a deliberately conservative similarity/blend — a wider key
            reproduces exactly this highlight-eating problem, confirmed
            visually before this file was finalized. */}
        <div className="relative w-full max-w-xl">
          {/* Single MP4, no WebM source anymore — the WebM's own claimed
              alpha channel (ALPHA_MODE:1 in the container) never actually
              decoded to real transparency in practice (verified via a raw
              decode: every sampled pixel came back fully opaque), so the
              two formats were just two copies of the same flat, wrongly
              colored studio backdrop. This MP4 is now recolored against
              paleHemp (this section's own resting page background) via a
              conservative ffmpeg colorkey pass — conservative specifically
              because this clip's highlight ridges sit close in color to
              its own background (see the comment above), so an aggressive
              key visibly eats into them; some background corners still
              carry a faint warm cast as a result, an accepted tradeoff
              over damaging the footage itself. Still a large improvement
              over the untouched original, whose backdrop didn't match the
              page at all (a warm taupe/beige rather than paleHemp). */}
          {/* `<source media>` instead of a plain `src` — see
              Section01FirstEncounter.tsx's own comment (prevents a real
              double-bandwidth mobile bug). */}
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            poster={isVideoNear ? media.section4.poster : undefined}
            aria-label={section04.heading}
            className="relative w-full object-contain"
            style={{ aspectRatio: "1280 / 720" }}
          >
            {isVideoNear && <source src={media.section4.desktop} media="(min-width: 768px)" />}
          </video>
        </div>
      </div>
    </section>
    </div>
  );
}
