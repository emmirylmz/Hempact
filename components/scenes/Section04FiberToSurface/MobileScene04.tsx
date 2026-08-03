"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { primeMobileVideo, scrubVideoToProgress } from "@/lib/useMobileVideoScrub";

// Mobile-only rendering of Section04, hosted inside MobileStageRunA — see
// MobileScene02.tsx's own comment, same pattern exactly. No glow-echo div
// here either, matching the desktop markup's own reasoning (this clip's
// own vignette already does that job — see Section04FiberToSurface.tsx).

// Same hard-edged, percentage-based corner clip as MobileScene02.tsx (see
// that file's own comment for why a percentage borderRadius — not a
// radial-gradient mask — is the right tool: it's a pure clip with no
// fade band eating into the frame, and it renders as an *oval* corner on
// this non-square box since each axis's radius scales with that axis's
// own dimension). Orthogonal to Section04's own chroma-key rejection
// (see [[mobile_unified_stage_architecture]]) — this doesn't key by
// color at all, just clips pixels at the corner, so it's safe on a clip
// with no flat backdrop to key against. Slightly larger than Section02's
// 6% per an explicit "biraz daha arttırarak" follow-up.
// 2026-08-04: reverted here from a brief Section05-mask trial (see
// [[section04_mobile_mask_trial]]) back to this original treatment, per
// explicit request.
const CORNER_RADIUS = "9%";
export function MobileScene04({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { section04 } = useContent();

  // Priming — see MobileScene01.tsx's own comment; this was missing here.
  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) primeMobileVideo(videoEl);
  }, []);

  // See MobileScene01.tsx's own comment on why this is in an effect.
  useEffect(() => {
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
          {section04.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light" style={{ color: colors.deepHemp }}>
          {section04.subheading}
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center">
        <div className="relative w-full max-w-xl">
          {/* `<source media>` instead of a plain `src` — see
              MobileScene01.tsx's own comment. */}
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            aria-label={section04.heading}
            className="relative w-full object-contain"
            style={{ aspectRatio: "1280 / 720", borderRadius: CORNER_RADIUS }}
          >
            <source src="/images/section4.mp4" media="(max-width: 767.98px)" />
          </video>
        </div>
      </div>
    </div>
  );
}
