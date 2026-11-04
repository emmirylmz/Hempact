"use client";

import { useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { scrubVideoToProgress } from "@/lib/useMobileVideoScrub";
import { MOBILE_SOURCE_MEDIA, useMobileSceneMedia, useMobileScrub } from "@/lib/mobileMedia";

// Pre-blurred halo (Faz 2 / P2, bulgu #10): the old
// `radial-gradient(ellipse 70% 65% at 50% 50%, deepHemp55 0%, transparent 75%)`
// + `blur(30px)` layer, sampled from Chromium's own blurred render at 390px
// into plain gradient stops (deepHemp = rgb(64,85,72)). Measured against the
// original: max 2.9/255, mean 0.30/255 per channel.
const HALO_07 =
  "radial-gradient(ellipse 41.6% 37.2% at 50% 50%, rgba(64,85,72,0.251) 0%, rgba(64,85,72,0.251) 5.6%, rgba(64,85,72,0.239) 11.1%, rgba(64,85,72,0.227) 16.7%, rgba(64,85,72,0.212) 22.2%, rgba(64,85,72,0.196) 27.8%, rgba(64,85,72,0.176) 33.3%, rgba(64,85,72,0.161) 38.9%, rgba(64,85,72,0.137) 44.4%, rgba(64,85,72,0.118) 50%, rgba(64,85,72,0.098) 55.6%, rgba(64,85,72,0.075) 61.1%, rgba(64,85,72,0.055) 66.7%, rgba(64,85,72,0.039) 72.2%, rgba(64,85,72,0.027) 77.8%, rgba(64,85,72,0.016) 83.3%, rgba(64,85,72,0.012) 88.9%, rgba(64,85,72,0.004) 94.4%, transparent 100%)";

// Mobile-only rendering of Section07, hosted inside MobileStageRunA — see
// MobileScene02.tsx's own comment. The sheen sweep + mouse-follow glow are
// desktop-only in the original code too (see useSection07Timeline.ts's own
// comment: "sheen sweep stays desktop-only, unlike the video") — this
// scene renders just the video, matching that.
export function MobileScene07({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { section07 } = useContent();

  // Lazy <source>/poster + deferred, sequential iOS priming: see
  // lib/mobileMedia.ts. The scrub itself is the same scrubVideoToProgress
  // call as before; useMobileScrub only re-applies the last progress once a
  // lazily attached video's metadata arrives.
  const media = useMobileSceneMedia("07", videoRef);
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
          {section07.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light" style={{ color: colors.deepHemp }}>
          {section07.subheading}
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center">
        <div className="relative h-[34dvh] w-full max-w-lg">
          {/* Was radial-gradient(ellipse 70% 65%, deepHemp55, transparent
              75%) + filter: blur(30px); now the pre-blurred result, see
              HALO_07's comment (box extended by 3σ = 90px). */}
          <div
            className="pointer-events-none absolute -z-10 scale-125"
            style={{ inset: "-90px", background: HALO_07 }}
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
              preload={media.preload}
              poster={media.poster}
              aria-label={section07.heading}
              className="absolute inset-0 h-full w-full object-cover"
            >
              {media.attached && <source src={media.src} type="video/mp4" media={MOBILE_SOURCE_MEDIA} />}
            </video>
          </div>
        </div>
      </div>
    </div>
  );
}
