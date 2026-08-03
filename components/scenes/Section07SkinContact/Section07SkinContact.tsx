"use client";

import { useRef } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useIsMobile } from "@/lib/useIsMobile";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";
import { useSection07Timeline } from "./useSection07Timeline";

export function Section07SkinContact() {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // Disabled on mobile — see Section01FirstEncounter's own comment on
  // this pattern; this section's mobile rendering now lives inside
  // MobileStageRunA (MobileScene07.tsx).
  useSceneBackgroundFlow(containerRef, colors.paleHemp, !isMobile);
  useSection07Timeline(
    { container: containerRef, video: videoRef, sheen: sheenRef, glow: glowRef },
    reducedMotion,
    isMobile
  );

  const { section07 } = useContent();

  // hidden md:contents: see Section01FirstEncounter's own comment on this
  // pattern.
  return (
    <div className="hidden md:contents">
    <section
      id="section-07-skin-contact"
      ref={containerRef}
      // z-[12]: see Section01FirstEncounter's own comment on this pattern.
      className="relative z-[12] flex min-h-dvh w-full flex-col items-center overflow-hidden px-6 pt-28 pb-12 md:pt-32"
    >
      <div className="relative z-10 mb-6 max-w-xl text-center md:mb-10">
        <h2
          className="text-3xl leading-tight font-light sm:text-4xl md:text-5xl"
          style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
        >
          {section07.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light sm:text-base" style={{ color: colors.deepHemp }}>
          {section07.subheading}
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center">
        <div className="relative h-[34dvh] w-full max-w-lg md:h-[40dvh]">
          <div
            className="pointer-events-none absolute inset-0 -z-10 scale-125"
            style={{
              background: `radial-gradient(ellipse 70% 65% at 50% 50%, ${colors.deepHemp}55 0%, transparent 75%)`,
              filter: "blur(30px)",
            }}
            aria-hidden
          />
          {/* No card, border, or shadow — a soft radial mask fades the
              footage's own edges into the section's flat color instead, so
              there's no rectangular "video player" edge to give away that
              this is a clip and not a native part of the page (same
              technique as Section06's own footage). */}
          <div
            className="relative h-full w-full"
            style={{
              maskImage: "radial-gradient(ellipse 62% 62% at 50% 50%, black 45%, transparent 92%)",
              WebkitMaskImage: "radial-gradient(ellipse 62% 62% at 50% 50%, black 45%, transparent 92%)",
            }}
          >
            {/* `<source media>` instead of a plain `src` — see
                Section01FirstEncounter.tsx's own comment (prevents a real
                double-bandwidth mobile bug). */}
            <video
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              aria-label={section07.heading}
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src="/images/skin-contact-weave.mp4" media="(min-width: 768px)" />
            </video>
            <div
              ref={sheenRef}
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(115deg, transparent 42%, ${colors.softClayRose}80 50%, transparent 58%)`,
              }}
              aria-hidden
            />
            <div
              ref={glowRef}
              className="pointer-events-none absolute h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: `radial-gradient(circle, ${colors.mutedHemp}55, transparent 70%)`,
                opacity: 0,
              }}
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
    </div>
  );
}
