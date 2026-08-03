"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { primeMobileVideo, scrubVideoToProgress } from "@/lib/useMobileVideoScrub";

// Mobile-only rendering of Section07, hosted inside MobileStageRunA — see
// MobileScene02.tsx's own comment. The sheen sweep + mouse-follow glow are
// desktop-only in the original code too (see useSection07Timeline.ts's own
// comment: "sheen sweep stays desktop-only, unlike the video") — this
// scene renders just the video, matching that.
export function MobileScene07({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { section07 } = useContent();

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
          {section07.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light" style={{ color: colors.deepHemp }}>
          {section07.subheading}
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center">
        <div className="relative h-[34dvh] w-full max-w-lg">
          <div
            className="pointer-events-none absolute inset-0 -z-10 scale-125"
            style={{
              background: `radial-gradient(ellipse 70% 65% at 50% 50%, ${colors.deepHemp}55 0%, transparent 75%)`,
              filter: "blur(30px)",
            }}
            aria-hidden
          />
          <div
            className="relative h-full w-full"
            style={{
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
              aria-label={section07.heading}
              className="absolute inset-0 h-full w-full object-cover"
            >
              <source src="/images/skin-contact-weave.mp4" media="(max-width: 767.98px)" />
            </video>
          </div>
        </div>
      </div>
    </div>
  );
}
