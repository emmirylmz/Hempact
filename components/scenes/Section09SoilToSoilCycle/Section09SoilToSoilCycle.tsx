"use client";

import { useRef } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useIsMobile } from "@/lib/useIsMobile";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";
import { useSection09Timeline } from "./useSection09Timeline";
import { CycleIllustration, stagePoint } from "./CycleIllustration";

export function Section09SoilToSoilCycle() {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const markerRef = useRef<SVGCircleElement>(null);
  const trailRef = useRef<SVGCircleElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { section09 } = useContent();
  const stageCount = section09.stages.length;

  // Disabled on mobile — see Section01FirstEncounter's own comment on
  // this pattern; this section's mobile rendering now lives inside
  // MobileStageRunB (MobileScene09.tsx).
  useSceneBackgroundFlow(containerRef, colors.mutedHemp, !isMobile);
  useSection09Timeline(
    { container: containerRef, marker: markerRef, trail: trailRef, labels: labelRefs },
    reducedMotion,
    isMobile,
    stageCount
  );

  // hidden md:contents: see Section01FirstEncounter's own comment on this
  // pattern.
  return (
    <div className="hidden md:contents">
    <section
      id="section-09-soil-to-soil-cycle"
      ref={containerRef}
      // z-[8]: see Section01FirstEncounter's own comment on this pattern.
      className="relative z-[8] flex min-h-dvh w-full flex-col items-center overflow-hidden px-6 pt-28 pb-12 md:pt-32"
    >
      <div className="relative z-10 mb-6 max-w-xl text-center md:mb-10">
        <h2
          className="text-2xl leading-tight font-light sm:text-3xl md:text-4xl"
          style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
        >
          {section09.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light sm:text-base" style={{ color: colors.charcoal, opacity: 0.75 }}>
          {section09.subheading}
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center">
        <div
          className="pointer-events-none absolute h-[40dvh] w-[40dvh] rounded-full md:h-[46dvh] md:w-[46dvh]"
          aria-hidden
        >
          {/* Was the same gradient + `filter: blur()`. Now pre-softened:
              extra stops follow the blurred profile (slightly lower peak,
              Gaussian tail), on a box grown 25% per side so the tail never
              meets an edge. Static paint, no per-frame GPU blur (bulgu #10). */}
          <div className="absolute -inset-[25%]" style={{ background: `radial-gradient(ellipse 33.33% 33.33% at 50% 50%, ${colors.deepHemp}31 0%, ${colors.deepHemp}20 37.5%, ${colors.deepHemp}05 75%, ${colors.deepHemp}01 90%, transparent 104%)` }} />
        </div>
        <CycleIllustration ref={svgRef} markerRef={markerRef} trailRef={trailRef} stageCount={stageCount} />

        {section09.stages.map((stage, index) => {
          const p = stagePoint(index, stageCount);
          return (
            <div
              key={stage}
              ref={(el) => {
                labelRefs.current[index] = el;
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-sm font-semibold tracking-[0.1em] uppercase sm:text-base md:text-lg"
              style={{
                left: `${(p.x / 400) * 100}%`,
                top: `${(p.y / 400) * 100 - 9}%`,
                color: colors.charcoal,
              }}
            >
              {stage}
            </div>
          );
        })}
      </div>
    </section>
    </div>
  );
}
