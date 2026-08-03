"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { primeMobileVideo, scrubVideoToProgress } from "@/lib/useMobileVideoScrub";

// Mobile-only rendering of Section06, hosted inside MobileStageRunA — see
// MobileScene02.tsx's own comment, same pattern. The desktop mobile branch
// this replaces also ran a separate wrapper fade/slide-in reveal; skipped
// here since the stage's own scene-level cross-fade already provides an
// equivalent "this scene is arriving" transition.
export function MobileScene06({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { section06 } = useContent();

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
          {section06.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light" style={{ color: colors.charcoal, opacity: 0.75 }}>
          {section06.subheading}
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center">
        <div className="relative w-full max-w-2xl" style={{ aspectRatio: "1280 / 720" }}>
          {/* `<source media>` instead of a plain `src` — see
              MobileScene01.tsx's own comment. */}
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
            <source src="/images/liquid-drop.mp4" media="(max-width: 767.98px)" />
          </video>
        </div>
      </div>
    </div>
  );
}
