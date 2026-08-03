"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap } from "@/lib/gsapConfig";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { primeMobileVideo, scrubVideoToProgress } from "@/lib/useMobileVideoScrub";
import {
  LAYER_ACCENTS,
  CAPTION_TIME_WINDOWS,
  CAPTION_TIME_EASE,
  CAPTION_DRIFT,
  layerPhase,
  smoothstep,
} from "./useSection05Stage";

// Mobile-only rendering of Section05, hosted inside MobileStageRunA (see
// components/scroll/MobileStage.tsx). Reuses the exact same per-layer
// time-windowed caption math (CAPTION_TIME_WINDOWS/layerPhase/smoothstep)
// this section's own useSection05Stage.ts already exports, just fed the
// stage's own `localProgress * duration` instead of that file's own
// (now mobile-disabled) ScrollTrigger progress — linear mapping, not
// desktop's CAPTIONS_END-weighted one, matching mobile's original
// behavior (no closing-beat mask-relax to protect here). Captions
// crossfade in one shared grid slot (not desktop's separately-sized
// grid cell, since this scene's own box is already compact).
export function MobileScene05({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const { section05 } = useContent();
  const layers = section05.layers;

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) primeMobileVideo(videoEl);
  }, []);

  // See MobileScene01.tsx's own comment on why this is in an effect.
  useEffect(() => {
    onProgressRef.current = (localProgress: number) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;
      const duration = videoEl.duration;
      if (!duration || Number.isNaN(duration)) return;
      scrubVideoToProgress(videoEl, localProgress);
      const target = localProgress * duration;

      captionRefs.current.forEach((caption, index) => {
        if (!caption) return;
        const window = CAPTION_TIME_WINDOWS[index];
        if (!window) return;
        const phase = layerPhase(target, window.start, window.end, CAPTION_TIME_EASE);
        const presence = 1 - smoothstep(Math.abs(phase));
        gsap.set(caption, { opacity: presence, y: -phase * CAPTION_DRIFT });

        // Desktop's own step-tick indicator (Section05PadLayers.tsx), ported
        // here — mobile previously had no visible cue tying the scroll
        // position to the story's own progress through the 4 layers, which
        // is a big part of why the scroll-driven reveal read as disconnected
        // from the video rather than one synced sequence.
        const tick = tickRefs.current[index];
        if (tick) {
          gsap.set(tick, { opacity: 0.3 + 0.7 * presence, scaleX: 0.6 + 0.4 * presence });
        }
      });
    };
  });

  return (
    // pt-28 + [justify-content:safe_center]: see MobileScene01.tsx's own
    // comment on this pattern (was plain justify-center, no top
    // clearance — could push the heading above y:0 on shorter viewports).
    // gap-10 here (not the old flat gap-8) — deliberately more room between
    // the heading and the video-group below than the video-group's own
    // *internal* gap-5, so the heading reads as a distinct title sitting
    // above one cohesive panel, instead of three equally-spaced, visually
    // disconnected blocks stacked in a row.
    <div className="relative flex h-full w-full flex-col items-center gap-10 overflow-hidden px-6 pt-28 pb-8 [justify-content:safe_center]">
      <h2
        // Narrower max-width + a touch smaller than desktop's own text-3xl
        // starting size — max-w-xl (576px) never actually constrained this
        // on any real phone width, so it was wrapping at whatever the
        // container's own edge happened to be per device instead of at a
        // deliberate, balanced line break. max-w-[17rem] forces a clean,
        // consistent 2-line wrap across the whole real-phone width range.
        className="max-w-[17rem] text-center text-[1.75rem] leading-[1.15] font-light"
        style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
      >
        {section05.heading}
      </h2>

      {/* Video + progress ticks + caption, grouped as one tight visual
          unit (gap-5, vs. the gap-10 separating this whole group from the
          heading above) — this is the actual "more integrated" fix: the
          three elements now read as one connected panel instead of
          independent stacked blocks. */}
      <div className="flex w-full max-w-2xl flex-col items-center gap-5">
        <div className="relative flex w-full items-center justify-center">
          {/* Soft ambient halo behind the video, ported from desktop's own
              viewport-wide glow (Section05PadLayers.tsx) — previously
              missing on mobile entirely, which is a real part of why the
              video read as a floating widget rather than atmospheric page
              content: nothing visually connected its edges to the page
              background behind it. */}
          <div
            className="pointer-events-none absolute -z-10 aspect-square w-[135%]"
            style={{ background: `radial-gradient(circle at 50% 50%, ${colors.softIvory}45 0%, transparent 65%)` }}
            aria-hidden
          />
          {/* TRIAL: Section06's own mask shape/values ported in here
              (MobileScene06.tsx: `ellipse 62% 62% at 50% 50%, black 45%,
              transparent 92%`) — a tighter, more aggressive porthole vignette
              than this section's previous 75%/97% closest-side fade
              (commented out below for a one-line revert). Deliberately kept
              on this *wrapping* div rather than moved onto the <video>
              element itself the way Section06 actually applies it —
              Section05 specifically has documented history of a real
              cross-browser bug from masking its own <video> directly (see
              [[section05_video_mask_on_video_element_bug]]), so only the
              mask's shape/stops were ported, not its placement. Ambient
              glow + drop-shadow are unchanged (not part of "masking"). */}
          <div
            className="relative aspect-video w-[92%] overflow-hidden"
            style={{
              filter: `drop-shadow(0 20px 36px ${colors.charcoal}18)`,
              // Previous treatment (still the default-of-record until this
              // trial is confirmed) — see [[section05_mask_trial]]:
              // maskImage: "radial-gradient(ellipse closest-side at 50% 50%, black 75%, transparent 97%)",
              // WebkitMaskImage: "radial-gradient(ellipse closest-side at 50% 50%, black 75%, transparent 97%)",
              maskImage: "radial-gradient(ellipse 62% 62% at 50% 50%, black 45%, transparent 92%)",
              WebkitMaskImage: "radial-gradient(ellipse 62% 62% at 50% 50%, black 45%, transparent 92%)",
            }}
          >
            {/* `<source media>` instead of a plain `src` — see
                MobileScene01.tsx's own comment. */}
            <video
              ref={videoRef}
              muted
              playsInline
              preload="auto"
              aria-label={section05.imageAlt}
              className="h-full w-full"
            >
              <source src="/images/ped1.1.mp4" media="(max-width: 767.98px)" />
            </video>
          </div>
        </div>

        {/* Step-tick row, ported from desktop — gives a persistent,
            always-visible readout of scroll progress through the 4 layers,
            synced off the exact same `presence` value as the caption
            crossfade below it (see the onProgressRef effect above), so it
            can never drift out of sync with what's on screen. */}
        <div className="flex items-center justify-center gap-2">
          {layers.map((layer, index) => (
            <span
              key={layer.name}
              ref={(el) => {
                tickRefs.current[index] = el;
              }}
              aria-hidden
              className="h-[3px] w-6 rounded-full"
              style={{
                backgroundColor: LAYER_ACCENTS[index],
                boxShadow: `0 0 8px ${LAYER_ACCENTS[index]}70`,
                opacity: 0.3,
                transform: "scaleX(0.6)",
              }}
            />
          ))}
        </div>

        <div className="grid min-h-[9rem] w-full max-w-2xs place-items-center text-center">
          {layers.map((layer, index) => (
            <div
              key={layer.name}
              ref={(el) => {
                captionRefs.current[index] = el;
              }}
              className="[grid-area:1/1] opacity-0"
            >
              {/* Numbered index + gradient tick, ported from desktop —
                  replaces the old plain accent dash with the same
                  "01 — layer name" language desktop already established,
                  tying each caption more explicitly to its own tick above. */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-medium tracking-[0.2em] tabular-nums" style={{ color: LAYER_ACCENTS[index] }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  aria-hidden
                  className="h-px w-6"
                  style={{ background: `linear-gradient(90deg, ${LAYER_ACCENTS[index]}, transparent)` }}
                />
              </div>
              <p className="mt-2 text-xl font-light" style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}>
                {layer.name}
              </p>
              <p className="mt-1.5 text-base font-light" style={{ color: colors.charcoal }}>
                {layer.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
