"use client";

import { useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { scrubVideoToProgress } from "@/lib/useMobileVideoScrub";
import { MOBILE_SOURCE_MEDIA, useMobileSceneMedia, useMobileScrub } from "@/lib/mobileMedia";

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

// Pre-blurred halo (Faz 2 / P2, bulgu #10): the exact look of the old
// `radial-gradient(ellipse, mutedHemp45, transparent 70%)` + `blur(40px)`
// layer, sampled from Chromium's own blurred render at 390px and written
// back as plain gradient stops (mutedHemp = rgb(143,162,130)). Measured
// against the original: max 2.9/255, mean 0.22/255 per channel — no live
// blur filter behind the scrubbing video.
const HALO_02 =
  "radial-gradient(ellipse 35.9% 33.4% at 50% 50%, rgba(143,162,130,0.153) 0%, rgba(143,162,130,0.153) 5.6%, rgba(143,162,130,0.149) 11.1%, rgba(143,162,130,0.141) 16.7%, rgba(143,162,130,0.133) 22.2%, rgba(143,162,130,0.122) 27.8%, rgba(143,162,130,0.11) 33.3%, rgba(143,162,130,0.098) 38.9%, rgba(143,162,130,0.082) 44.4%, rgba(143,162,130,0.071) 50%, rgba(143,162,130,0.063) 55.6%, rgba(143,162,130,0.047) 61.1%, rgba(143,162,130,0.035) 66.7%, rgba(143,162,130,0.027) 72.2%, rgba(143,162,130,0.016) 77.8%, rgba(143,162,130,0.012) 83.3%, rgba(143,162,130,0.008) 88.9%, rgba(143,162,130,0.004) 94.4%, transparent 100%)";

// Mobile-only rendering of Section02, hosted inside MobileStageRunA (see
// components/scroll/MobileStage.tsx) instead of owning its own independent
// pin. No separate entrance timeline here (unlike Section01) — this
// section's heading/subheading are plain static text, and the video's own
// opacity fade-in is folded into the stage's own cross-fade instead of a
// bespoke `tl.to(videoEl, {opacity:1})` the desktop timeline uses.
export function MobileScene02({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { section02 } = useContent();

  // Same full 0-to-duration linear mapping as desktop's own
  // `self.progress * duration` in useSection02Timeline.ts — no trimmed
  // start/end offsets on either side, so the same scroll position shows
  // the same frame on both. Lazy <source>/poster + deferred, sequential
  // iOS priming: see lib/mobileMedia.ts (poster is the t=0 frame, since the
  // scrub starts at t=0 — no jump when the first seek replaces it).
  const media = useMobileSceneMedia("02", videoRef);
  useMobileScrub(videoRef, onProgressRef, scrubVideoToProgress);

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
          {/* Was radial-gradient(ellipse, mutedHemp45, transparent 70%)
              + filter: blur(40px). Replaced by the blurred result itself,
              sampled into gradient stops (box extended by 3σ = 120px);
              max 2.9/255 difference — see HALO_02's comment. */}
          <div
            className="pointer-events-none absolute -z-10 scale-150"
            style={{ inset: "-120px", background: HALO_02 }}
            aria-hidden
          />
          {/* `<source media>` instead of a plain `src` — see
              MobileScene01.tsx's own comment (prevents this mobile-only
              file from also loading on a desktop visit). */}
          <video
            ref={videoRef}
            muted
            playsInline
            preload={media.preload}
            poster={media.poster}
            aria-hidden
            className="relative w-full object-contain"
            style={{ aspectRatio: "1280 / 720", borderRadius: CORNER_RADIUS }}
          >
            {media.attached && <source src={media.src} type="video/mp4" media={MOBILE_SOURCE_MEDIA} />}
          </video>
        </div>
      </div>
    </div>
  );
}
