"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { CycleIllustration, stagePoint } from "./CycleIllustration";

const R = 150;
const CIRCUMFERENCE = 2 * Math.PI * R;
// Labels sit further out than the ring/dots (R) so they don't crowd the
// shape. The old fix used a flat "-9%" vertical nudge on every label,
// which only helps the top-ish stages — for the two lower stages
// ("Yüzey", "Ürün", sitting below center) the same upward shift actually
// pulls them *toward* the ring instead of away from it, which is exactly
// the reported bug. Pushing the label's own point radially outward
// (bigger radius, same angle) moves every label away from the shape in
// its own correct direction regardless of which side of the circle it's
// on, and still reads as "pointing at" the same spot on the ring.
const LABEL_R = R + 35;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Pre-blurred halo (Faz 2 / P2, bulgu #10): the old
// `radial-gradient(closest-side, deepHemp40, transparent 75%)` + `blur(30px)`
// layer, sampled from Chromium's own blurred render at 390x844 into plain
// gradient stops (deepHemp = rgb(64,85,72)). Measured against the original:
// max 2.2/255, mean 0.13/255 per channel.
const HALO_09 =
  "radial-gradient(ellipse 31.9% 31.9% at 50% 50%, rgba(64,85,72,0.176) 0%, rgba(64,85,72,0.173) 5.6%, rgba(64,85,72,0.169) 11.1%, rgba(64,85,72,0.161) 16.7%, rgba(64,85,72,0.149) 22.2%, rgba(64,85,72,0.137) 27.8%, rgba(64,85,72,0.122) 33.3%, rgba(64,85,72,0.11) 38.9%, rgba(64,85,72,0.09) 44.4%, rgba(64,85,72,0.075) 50%, rgba(64,85,72,0.063) 55.6%, rgba(64,85,72,0.047) 61.1%, rgba(64,85,72,0.035) 66.7%, rgba(64,85,72,0.024) 72.2%, rgba(64,85,72,0.016) 77.8%, rgba(64,85,72,0.012) 83.3%, rgba(64,85,72,0.008) 88.9%, rgba(64,85,72,0.004) 94.4%, transparent 100%)";

// Mobile-only rendering of Section09, hosted inside MobileStageRunB (see
// components/scroll/MobileStage.tsx). Unlike Section01-07, Section09
// previously had NO real mobile pin at all — its old `isMobile` branch
// (see useSection09Timeline.ts) was just a one-shot label fade-in, not
// the marker-travels-the-circle scrub desktop gets. This scene ports
// desktop's own timeline math (marker angle, trail dashoffset, per-label
// opacity keyed to timeline position) to run off the stage's own
// `localProgress` instead of an independent ScrollTrigger-scrubbed
// gsap.timeline — the label-opacity math below is a direct translation of
// useSection09Timeline.ts's desktop `tl.to(...)` position arguments
// (`i`, `i+0.7`, `stageCount-0.3`) into a plain function of timeline-time
// `t = localProgress * stageCount`, since a GSAP timeline scrubbed 0→1 by
// a ScrollTrigger is mathematically just that: position arguments are
// timeline-time, and progress from 0..1 maps linearly to 0..duration.
function labelOpacity(t: number, index: number, count: number): number {
  const isLast = index === count - 1;
  if (t < index) return 0.25;
  if (t < index + 0.3) return lerp(0.25, 1, (t - index) / 0.3);
  if (isLast) return 1; // desktop's own final override keeps the last label lit instead of fading it back down
  if (t < index + 0.7) return 1;
  if (t < index + 1.0) return lerp(1, 0.35, (t - (index + 0.7)) / 0.3);
  return 0.35;
}

export function MobileScene09({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const markerRef = useRef<SVGCircleElement>(null);
  const trailRef = useRef<SVGCircleElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const { section09 } = useContent();
  const stageCount = section09.stages.length;

  useEffect(() => {
    labelRefs.current.forEach((el) => {
      if (el) el.style.opacity = "0.25";
    });
  }, []);

  useEffect(() => {
    onProgressRef.current = (localProgress: number) => {
      const t = localProgress * stageCount;
      const angle = localProgress * Math.PI * 2;
      const cx = 200 + R * Math.cos(angle - Math.PI / 2);
      const cy = 200 + R * Math.sin(angle - Math.PI / 2);
      markerRef.current?.setAttribute("cx", String(cx));
      markerRef.current?.setAttribute("cy", String(cy));
      trailRef.current?.setAttribute("stroke-dashoffset", String(CIRCUMFERENCE * (1 - localProgress)));

      labelRefs.current.forEach((el, index) => {
        if (!el) return;
        el.style.opacity = String(labelOpacity(t, index, stageCount));
      });
    };
  });

  return (
    // pt-28 + [justify-content:safe_center]: see MobileScene01.tsx's own
    // comment on this pattern (was pt-16, less than the header's ~72px).
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden px-6 pt-28 pb-8 [justify-content:safe_center]">
      <div className="relative z-10 mb-6 max-w-xl text-center">
        <h2
          className="text-2xl leading-tight font-light"
          style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
        >
          {section09.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light" style={{ color: colors.charcoal, opacity: 0.75 }}>
          {section09.subheading}
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center">
        {/* Was a rounded 40dvh square with radial-gradient(closest-side,
            deepHemp40, transparent 75%) + filter: blur(30px). Now the
            pre-blurred result on a box grown by 3σ = 90px each side (still
            centred by this flex container) — see HALO_09. */}
        <div
          className="pointer-events-none absolute h-[calc(40dvh+180px)] w-[calc(40dvh+180px)]"
          style={{ background: HALO_09 }}
          aria-hidden
        />
        <CycleIllustration ref={svgRef} markerRef={markerRef} trailRef={trailRef} stageCount={stageCount} />

        {section09.stages.map((stage, index) => {
          const p = stagePoint(index, stageCount, LABEL_R);
          const words = stage.split(" ");
          return (
            <div
              key={stage}
              ref={(el) => {
                labelRefs.current[index] = el;
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-center text-sm leading-tight font-semibold tracking-[0.1em] uppercase"
              style={{
                left: `${(p.x / 400) * 100}%`,
                top: `${(p.y / 400) * 100}%`,
                color: colors.charcoal,
              }}
            >
              {/* Multi-word stages (only "Yeni döngü") stack one word per
                  line instead of rendering as one long single-line string
                  — that single line was wide enough, at this stage's
                  left-leaning position, to run off the left edge of
                  narrow phone viewports (confirmed via a real pixel
                  measurement: getBoundingClientRect().left went negative
                  at ~360-390px viewport widths before this fix). Stacking
                  roughly halves the box's rendered width. */}
              {words.map((word) => (
                <span key={word} className="block">
                  {word}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
