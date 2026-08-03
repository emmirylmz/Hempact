"use client";

import type { RefObject } from "react";
import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsapConfig";
import { colors } from "@/lib/theme";

interface Section05StageRefs {
  section: RefObject<HTMLElement | null>;
  wrapperRef: RefObject<HTMLDivElement | null>;
  video: RefObject<HTMLVideoElement | null>;
  videoMask: RefObject<HTMLDivElement | null>;
  captionRefs: RefObject<(HTMLDivElement | null)[]>;
  tickRefs: RefObject<(HTMLSpanElement | null)[]>;
}

// One accent per layer, cycling through the brand palette — ties each
// caption's index mark to its own indicator tick, purely a small-UI detail
// (not used for the page background — see Section05PadLayers.tsx's own
// useSceneBackgroundFlow call for why that's a single neutral tone
// instead). Ordered to match content.ts's section05.layers declaration
// (base, core, distributor, top) — each layer keeps its own accent
// regardless of display order.
export const LAYER_ACCENTS = [colors.warmTaupe, colors.deepHemp, colors.mutedCycleRed, colors.mutedHemp];

// ped1.1.mp4 is the same underlying choreography as the earlier ped1.mp4
// (a higher-quality 1920x1080/30fps re-render, not different footage) —
// re-verified via the same contact-sheet method that its beats land at
// essentially the same real-world timestamps (within this file's own
// existing ease tolerance), so these boundaries carry over unchanged; see
// [[section05_ped1_video_swap]]. A single assembled pad idles until ~1.4s,
// the top surface flies off alone and clears the frame by ~2.6s, the
// absorbent core separates out next through ~4.0s, the distributor sheet
// peels off the base last (~4.0s-5.4s), the fully-exploded stack then just
// orbits in place with no further separation until REVEAL_END — which
// marks the end of that hold, not the end of all motion: reassembly, a
// flex flourish, and the settle back to a flat rest frame all happen after
// it, during the closing beat.
const REVEAL_END = 7;

// Fraction of the stage's scroll range spent revealing the 4 layers; the
// remainder is the closing beat (reassemble, flex, settle).
const CAPTIONS_END = 0.7;

// Deliberately sequential (0→1→2→3), matching content.ts's section05.layers
// declaration order (Alt yüzey, Emici katman, Dağıtıcı katman (ADL), Üst
// yüzey) — the requested text reveal order, not the order ped1.1.mp4's own
// footage reveals them in (top-first, base-last; see the timeline comment
// above). Captions now intentionally run ahead of/behind what's physically
// happening on screen at each window; this was a deliberate call, not an
// oversight.
// Exported: reused as-is by MobileScene05.tsx (hosted inside
// MobileStageRunA — see components/scroll/MobileStage.tsx), which drives
// this exact same per-layer time-windowed reveal off the stage's own
// per-scene progress instead of this file's own (now-removed) mobile pin.
export const CAPTION_TIME_WINDOWS: Record<number, { start: number; end: number }> = {
  0: { start: 1.4, end: 2.6 },
  1: { start: 2.6, end: 4 },
  2: { start: 4, end: 5.4 },
  3: { start: 5.4, end: REVEAL_END },
};
// How far outside each window's exact edges the ease ramp reaches — the
// windows' own start/end are untouched, this only softens what happens
// just before/after them.
export const CAPTION_TIME_EASE = 0.35;
export const CAPTION_DRIFT = 10;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const clamp = (min: number, max: number, value: number) => Math.min(max, Math.max(min, value));
export const smoothstep = (t: number) => t * t * (3 - 2 * t);

// A single signed "phase" per layer drives its caption's opacity, drift,
// and scale, *and* its indicator tick, all from the same eased number —
// nothing here can independently drift out of sync with anything else,
// the same principle the outer scrub already applies to the video/
// captions as a whole. phase is 0 for the whole time the layer is
// "current", ramps smoothly to -1 approaching the window from before and
// to +1 leaving it after — so a caption always finishes entering (phase
// reaches 0) at exactly the same instant it reaches full opacity, and
// only starts leaving once it's already fully legible.
export function layerPhase(time: number, start: number, end: number, ease: number) {
  if (time < start) return clamp(-1, 0, (time - start) / ease);
  if (time > end) return clamp(0, 1, (time - end) / ease);
  return 0;
}

// "closest-side" sizes the fade to the box's own edges rather than a fixed
// percentage, so it's guaranteed to reach full transparency at and before
// every edge (corners included, since they sit outside this ellipse
// entirely) — this box is the video's *own* aspect-video wrapper (see
// Section05PadLayers.tsx), not the outer 4:3 stage, so that guarantee
// applies directly to the video's real boundary.
const VIDEO_MASK = (opaque: number, fade: number) =>
  `radial-gradient(ellipse closest-side at 50% 50%, black ${opaque}%, transparent ${fade}%)`;

// Drives the whole stage off one continuous scrub — a single `progress`
// value per frame, and the video's currentTime, every caption's motion,
// and the mask are all just functions of it, so nothing can drift out of
// sync with anything else.
export function useSection05Stage(
  { section, wrapperRef, video, videoMask, captionRefs, tickRefs }: Section05StageRefs,
  reducedMotion: boolean,
  isMobile: boolean
) {
  useEffect(() => {
    const sectionEl = section.current;
    const wrapper = wrapperRef.current;
    const videoEl = video.current;
    const videoMaskEl = videoMask.current;
    const captions = (captionRefs.current ?? []).filter((el): el is HTMLDivElement => Boolean(el));
    if (!sectionEl || !wrapper || !videoEl || !videoMaskEl || captions.length === 0) return;

    if (reducedMotion) return;

    if (isMobile) {
      // No-op: this section's mobile rendering (video scrub + the caption
      // crossfade, using this file's own exported CAPTION_TIME_WINDOWS/
      // layerPhase/smoothstep) now lives inside MobileStageRunA — see
      // components/scroll/MobileStage.tsx and MobileScene05.tsx. This
      // desktop copy is CSS-hidden on mobile
      // (Section05PadLayers.tsx's `hidden md:contents` wrapper).
      return;
    }

    let scrub: ScrollTrigger | undefined;
    let cancelled = false;

    const setup = () => {
      if (cancelled) return;
      const duration = videoEl.duration;
      if (!duration || Number.isNaN(duration)) return;

      // The footage is encoded with a keyframe every 2 frames specifically
      // so arbitrary seeks stay cheap (see [[scroll_scrub_video_keyframes]])
      // — but redundant same-frame seeks are still wasted decode work, so
      // skip any update smaller than half a frame at its native 24fps.
      const FRAME_EPSILON = 1 / 48;
      const ticks = tickRefs.current ?? [];

      scrub = ScrollTrigger.create({
        trigger: wrapper,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
        onUpdate: (self) => {
          const progress = self.progress;
          const closingFrac = clamp01((progress - CAPTIONS_END) / (1 - CAPTIONS_END));

          const target =
            progress <= CAPTIONS_END
              ? (progress / CAPTIONS_END) * REVEAL_END
              : REVEAL_END + closingFrac * (duration - REVEAL_END);
          if (Math.abs(videoEl.currentTime - target) > FRAME_EPSILON) {
            videoEl.currentTime = target;
          }

          captions.forEach((caption, index) => {
            const window = CAPTION_TIME_WINDOWS[index];
            const phase = layerPhase(target, window.start, window.end, CAPTION_TIME_EASE);
            const presence = 1 - smoothstep(Math.abs(phase));

            gsap.set(caption, {
              opacity: presence,
              y: -phase * CAPTION_DRIFT,
              scale: 0.97 + 0.03 * presence,
            });

            const tick = ticks[index];
            if (tick) {
              gsap.set(tick, { opacity: 0.3 + 0.7 * presence, scaleX: 0.6 + 0.4 * presence });
            }
          });

          // Closing beat: the vignette relaxes toward full clarity as the
          // footage reassembles and settles. Base 75/97 — see
          // Section05PadLayers.tsx's own comment on videoMaskRef for why
          // these are now evaluated directly against the video's own true
          // box rather than a separately-sized outer stage.
          const maskStyle = VIDEO_MASK(75 + 7 * closingFrac, 97 + 2 * closingFrac);
          videoMaskEl.style.maskImage = maskStyle;
          videoMaskEl.style.webkitMaskImage = maskStyle;
        },
      });
    };

    if (videoEl.readyState >= 1) {
      setup();
    } else {
      videoEl.addEventListener("loadedmetadata", setup, { once: true });
    }

    return () => {
      cancelled = true;
      scrub?.kill();
      videoEl.removeEventListener("loadedmetadata", setup);
    };
  }, [section, wrapperRef, video, videoMask, captionRefs, tickRefs, reducedMotion, isMobile]);
}
