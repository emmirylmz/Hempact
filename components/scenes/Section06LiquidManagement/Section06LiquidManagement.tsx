"use client";

import { useRef } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useIsMobile } from "@/lib/useIsMobile";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";
import { useSection06Timeline } from "./useSection06Timeline";

export function Section06LiquidManagement() {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Disabled on mobile — see Section01FirstEncounter's own comment on
  // this pattern; this section's mobile rendering now lives inside
  // MobileStageRunA (MobileScene06.tsx).
  useSceneBackgroundFlow(containerRef, colors.softClayRose, !isMobile);
  useSection06Timeline(
    { container: containerRef, wrapper: wrapperRef, video: videoRef },
    reducedMotion,
    isMobile
  );

  const { section06 } = useContent();

  // hidden md:contents: see Section01FirstEncounter's own comment on this
  // pattern.
  return (
    <div className="hidden md:contents">
    <section
      id="section-06-liquid-management"
      ref={containerRef}
      // z-[14]: see Section01FirstEncounter's own comment on this pattern.
      className="relative z-[14] flex min-h-dvh w-full flex-col items-center overflow-hidden px-6 pt-28 pb-12 md:pt-32"
    >
      <div className="relative z-10 mb-6 max-w-xl text-center md:mb-10">
        <h2
          className="text-3xl leading-tight font-light sm:text-4xl md:text-5xl"
          style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
        >
          {section06.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light sm:text-base" style={{ color: colors.charcoal, opacity: 0.75 }}>
          {section06.subheading}
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center">
        <div ref={wrapperRef} className="relative w-full max-w-2xl" style={{ aspectRatio: "1280 / 720" }}>
          {/* No card, border, or shadow — a soft radial mask fades the
              footage's own (already close-to-brand-tone) background into
              the section's flat color instead, so there's no rectangular
              "video player" edge to give away that this is a clip and not
              a native part of the page. */}
          {/* `<source media>` instead of a plain `src` — see
              Section01FirstEncounter.tsx's own comment (prevents a real
              double-bandwidth mobile bug). */}
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            aria-label={section06.heading}
            className="h-full w-full object-cover"
            style={{
              maskImage: "radial-gradient(ellipse 62% 62% at 50% 50%, black 45%, transparent 92%)",
              WebkitMaskImage: "radial-gradient(ellipse 62% 62% at 50% 50%, black 45%, transparent 92%)",
            }}
          >
            <source src="/images/liquid-drop.mp4" media="(min-width: 768px)" />
          </video>
        </div>
      </div>
    </section>
    </div>
  );
}
