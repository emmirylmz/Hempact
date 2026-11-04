"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { ScrollTrigger } from "@/lib/gsapConfig";
import { syncScrubOnLoad, scrubTargetTime } from "@/lib/useLazyVideoSource";

type Refs = {
  container: RefObject<HTMLElement | null>;
  video: RefObject<HTMLVideoElement | null>;
};

// Same pattern as Section01FirstEncounter's useSection01VideoScrub: the
// closing hemp-field footage plays out as the reader scrolls through the
// section (seedling growth → dew → wide cultivated field), rather than
// autoplaying on its own.
export function useSection12VideoScrub({ container, video }: Refs, reducedMotion: boolean, isMobile: boolean) {
  useGSAP(
    () => {
      const videoEl = video.current;
      if (!videoEl) return;

      if (reducedMotion) return;

      if (isMobile) {
        // No-op: this section's mobile rendering now lives inside
        // MobileStageRunC (see components/scroll/MobileStage.tsx and
        // MobileScene12.tsx). This desktop copy is CSS-hidden on mobile.
        return;
      }

      // The pin must exist regardless of whether the video's metadata has
      // loaded yet — this section's video is now lazy-loaded (see
      // [[desktop_video_lazy_preload]]), so gating pin creation behind
      // `loadedmetadata` (as this used to do) meant the pin simply didn't
      // exist yet by the time the reader scrolled down to it, and the
      // section fell into normal document flow, overlapping Section10/11
      // above it. Only the `currentTime` scrub waits, guarded inline in
      // onUpdate — same fix already applied to every other desktop
      // section's own timeline (see e.g. useSection02Timeline.ts).
      const FRAME_EPSILON = 1 / 30;

      const scrollTrigger = ScrollTrigger.create({
        trigger: container.current,
        start: "top top",
        end: "+=150%",
        pin: true,
        anticipatePin: 1,
        scrub: 0.5,
        onUpdate: (self) => {
          const duration = videoEl.duration;
          if (!duration || Number.isNaN(duration)) return;
          const target = self.progress * duration;
          if (Math.abs(videoEl.currentTime - target) > FRAME_EPSILON) {
            videoEl.currentTime = target;
          }
        },
      });

      // QC2 O2: re-apply the current scroll position once the (lazily
      // attached) source's metadata/data arrives — see syncScrubOnLoad.
      return syncScrubOnLoad(videoEl, () => scrubTargetTime(videoEl, scrollTrigger.progress));
    },
    { scope: container, dependencies: [reducedMotion, isMobile] }
  );
}
