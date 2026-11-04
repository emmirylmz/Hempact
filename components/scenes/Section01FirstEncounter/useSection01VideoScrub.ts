"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { ScrollTrigger } from "@/lib/gsapConfig";
import { syncScrubOnLoad, scrubTargetTime } from "@/lib/useLazyVideoSource";

type Refs = {
  container: RefObject<HTMLElement | null>;
  video: RefObject<HTMLVideoElement | null>;
};

// Scrubs the hero's plant-growth footage against scroll — the reader grows
// the plant themselves by scrolling, rather than just watching it autoplay.
export function useSection01VideoScrub({ container, video }: Refs, reducedMotion: boolean, isMobile: boolean) {
  useGSAP(
    () => {
      const videoEl = video.current;
      if (!videoEl) return;

      if (reducedMotion) return;

      if (isMobile) {
        // No-op: this section's mobile rendering (including its own video
        // scrub) now lives inside MobileStageRunA — see
        // components/scroll/MobileStage.tsx and MobileScene01.tsx, which
        // drives this same section's video element via the stage's own
        // per-scene `onLocalProgress` instead of an independent pin here.
        // This desktop copy is CSS-hidden on mobile (`hidden md:contents`
        // in Section01FirstEncounter.tsx) — running a second, independent
        // pin against it too would just fight the stage's single pin.
        return;
      }

      // The pin must exist regardless of whether the video's metadata has
      // loaded yet — this used to gate `ScrollTrigger.create` itself behind
      // `loadedmetadata`, which is safe only as long as this video stays
      // eager (`preload="auto"` with no lazy-mount delay, since it's the
      // hero, always above the fold). Section12 had this exact same
      // pattern and broke (section fell into normal document flow,
      // overlapping the one above it) once its video was lazy-loaded — see
      // [[desktop_video_lazy_preload]]. Fixed here too for consistency/
      // robustness even though Section01 isn't itself lazy-loaded. Only the
      // `currentTime` scrub waits, guarded inline in onUpdate.
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
