"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { primeMobileVideo, scrubVideoToProgress } from "@/lib/useMobileVideoScrub";

// Canvas chroma-key transparency was tried here (see
// [[mobile_unified_stage_architecture]] for the full history — a real
// seed-eating bug, a border-connected flood-fill fix, several rounds of
// radial-gradient corner-vignette tuning) and has settled on something
// simpler: a plain rounded-corner clip, not a soft radial fade at all.
// The radial-gradient approach (even sized via `farthest-corner` to stay
// clear of the edge-midpoints) is still a *soft, gradual* fade that
// necessarily eats some distance into the frame before reaching full
// transparency. The actual ask was narrower than that: keep the sharp
// 90° corners from showing as sharp corners — i.e. round them off — but
// don't let the ovalness reach into the video at all otherwise. A
// percentage `borderRadius` is a hard-edged clip (no soft fade band) and
// naturally renders as an *oval* corner (not a circular one) whenever the
// box isn't square, since each axis's radius is a percentage of that
// axis's own dimension — exactly "sadece dik köşeler oval olsun" with no
// separate mask-image machinery needed. A small percentage keeps the cut
// tiny relative to the frame at any viewport width.
const CORNER_RADIUS = "6%";

// Mobile-only rendering of Section02, hosted inside MobileStageRunA (see
// components/scroll/MobileStage.tsx) instead of owning its own independent
// pin. No separate entrance timeline here (unlike Section01) — this
// section's heading/subheading are plain static text, and the video's own
// opacity fade-in is folded into the stage's own cross-fade instead of a
// bespoke `tl.to(videoEl, {opacity:1})` the desktop timeline uses.
export function MobileScene02({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { section02 } = useContent();

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) primeMobileVideo(videoEl);
  }, []);

  useEffect(() => {
    // Same full 0-to-duration linear mapping as desktop's own
    // `self.progress * duration` in useSection02Timeline.ts — no trimmed
    // start/end offsets on either side, so the same scroll position shows
    // the same frame on both.
    onProgressRef.current = (localProgress: number) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;
      scrubVideoToProgress(videoEl, localProgress);
    };
  });

  return (
    // pt-28 + [justify-content:safe_center]: see MobileScene01.tsx's own
    // comment on this pattern (was pt-16, less than the header's ~72px).
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden px-6 pt-28 pb-8 [justify-content:safe_center]">
      <div className="relative z-10 mb-6 max-w-xl text-center">
        <h2
          className="text-3xl leading-tight font-light"
          style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
        >
          {section02.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light" style={{ color: colors.deepHemp }}>
          {section02.subheading}
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center">
        <div className="relative w-full max-w-xl">
          <div
            className="pointer-events-none absolute inset-0 -z-10 scale-150"
            style={{
              background: `radial-gradient(ellipse, ${colors.mutedHemp}45, transparent 70%)`,
              filter: "blur(40px)",
            }}
            aria-hidden
          />
          {/* `<source media>` instead of a plain `src` — see
              MobileScene01.tsx's own comment (prevents this mobile-only
              file from also loading on a desktop visit). */}
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            aria-hidden
            className="relative w-full object-contain"
            style={{ aspectRatio: "1280 / 720", borderRadius: CORNER_RADIUS }}
          >
            <source src="/images/section2.mp4" media="(max-width: 767.98px)" />
          </video>
        </div>
      </div>
    </div>
  );
}
