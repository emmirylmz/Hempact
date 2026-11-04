"use client";

import { useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { scrubVideoToProgress } from "@/lib/useMobileVideoScrub";
import { MOBILE_SOURCE_MEDIA, useMobileSceneMedia, useMobileScrub } from "@/lib/mobileMedia";
import { useSection01Timeline } from "./useSection01Timeline";
import { TriToneBackground } from "./TriToneBackground";

// Pre-rendered stand-in for the old `filter: blur(60px)` glow behind the
// hero video — see the comment at its use site below.
const S01_GLOW =
  "linear-gradient(90deg, transparent 0%, rgba(220,227,210,0.006) 4.2%, rgba(220,227,210,0.022) 8.3%, rgba(220,227,210,0.067) 12.5%, rgba(206,216,206,0.144) 16.7%, rgba(201,206,191,0.289) 20.8%, rgba(198,207,186,0.472) 25%, rgba(192,203,186,0.656) 29.2%, rgba(186,198,180,0.817) 33.3%, rgba(175,187,171,0.922) 37.5%, rgba(166,178,162,0.972) 41.7%, rgba(154,167,151,0.994) 45.8%, rgba(142,156,140,1) 50%, rgba(130,144,130,0.994) 54.2%, rgba(117,134,118,0.972) 58.3%, rgba(106,123,108,0.922) 62.5%, rgba(99,116,102,0.817) 66.7%, rgba(91,108,95,0.656) 70.8%, rgba(84,102,90,0.472) 75%, rgba(78,103,83,0.289) 79.2%, rgba(78,108,88,0.144) 83.3%, rgba(78,108,88,0.067) 87.5%, rgba(78,108,88,0.022) 91.7%, rgba(78,108,88,0.006) 95.8%, transparent 100%)";
const S01_GLOW_MASK =
  "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.008) 6.3%, rgba(0,0,0,0.02) 12.5%, rgba(0,0,0,0.071) 18.7%, rgba(0,0,0,0.173) 25%, rgba(0,0,0,0.325) 31.3%, rgba(0,0,0,0.51) 37.5%, rgba(0,0,0,0.655) 43.8%, rgba(0,0,0,0.706) 50%, rgba(0,0,0,0.655) 56.3%, rgba(0,0,0,0.51) 62.5%, rgba(0,0,0,0.333) 68.8%, rgba(0,0,0,0.173) 75%, rgba(0,0,0,0.075) 81.3%, rgba(0,0,0,0.024) 87.5%, rgba(0,0,0,0.008) 93.8%, rgba(0,0,0,0) 100%)";

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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subheadingRef = useRef<HTMLParagraphElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);

  useSection01Timeline(
    { container: containerRef, image: imageRef, heading: headingRef, subheading: subheadingRef, scrollCue: scrollCueRef },
    reducedMotion,
    undefined,
    "css"
  );

  // Lazy source + poster + (deferred, sequential) iOS priming now come from
  // the shared mobile video scheduler — see lib/mobileMedia.ts. S01 is the
  // one scene whose <source> is in the server HTML (starts HOT), so the hero
  // video still begins downloading with the page itself. The priming that
  // used to run here on mount (root cause of an old "Section01-04 videos not
  // visible on mobile" report) is kept, just scheduled: active + next scene
  // only, one at a time, after load + idle or the first touch.
  const media = useMobileSceneMedia("01", videoRef);
  useMobileScrub(videoRef, onProgressRef, scrubVideoToProgress);

  const { section01 } = useContent();

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

      <div ref={imageRef} className="hero-enter-image relative z-10 mb-8 w-full max-w-xl px-10">
        {/* Same glow as before (paleHemp→deepHemp box, blur(60px), 0.9
            opacity), without a live 60px blur under the hero video. A
            Gaussian blur of a box is separable — alpha(x,y) = ax(x)·ay(y)
            and the colour only varies along x — so it is reproduced by a
            horizontal colour+alpha gradient times a vertical alpha mask,
            sampled from the real blurred render (390px viewport, box
            extended by 3σ = 180px each side). Measured against the blurred
            original: max 4.3/255, mean 0.46/255 per channel. Static, so it
            is painted once instead of re-filtered by the compositor. */}
        <div
          className="pointer-events-none absolute -z-10 scale-[1.9]"
          style={{ inset: "-180px", background: S01_GLOW, maskImage: S01_GLOW_MASK, WebkitMaskImage: S01_GLOW_MASK }}
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
            preload={media.preload}
            poster={media.poster}
            aria-label={section01.imageAlt}
            className="h-full w-full object-contain"
            style={{
              maskImage: "radial-gradient(ellipse closest-side at 50% 52%, black 70%, transparent 92%)",
              WebkitMaskImage: "radial-gradient(ellipse closest-side at 50% 52%, black 70%, transparent 92%)",
            }}
          >
            {media.attached && <source src={media.src} type="video/mp4" media={MOBILE_SOURCE_MEDIA} />}
          </video>
        </div>
      </div>

      <h1
        ref={headingRef}
        className="hero-enter-heading relative z-10 max-w-3xl text-center text-3xl leading-tight font-light"
        style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
      >
        {section01.heading}
      </h1>

      <p
        ref={subheadingRef}
        className="hero-enter-subheading relative z-10 mx-auto mt-5 max-w-md text-center text-sm font-light"
        style={{ color: colors.deepHemp }}
      >
        {section01.subheading}
      </p>

      <div
        ref={scrollCueRef}
        className="hero-enter-cue absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-[11px] tracking-[0.3em] uppercase"
        style={{ color: colors.charcoal }}
      >
        {section01.scrollCue}
      </div>
    </div>
  );
}
