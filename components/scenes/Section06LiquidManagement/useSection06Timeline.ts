"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { ScrollTrigger } from "@/lib/gsapConfig";

type Refs = {
  container: RefObject<HTMLElement | null>;
  wrapper: RefObject<HTMLDivElement | null>;
  video: RefObject<HTMLVideoElement | null>;
};

export function useSection06Timeline(
  { container, wrapper, video }: Refs,
  reducedMotion: boolean,
  isMobile: boolean
) {
  useGSAP(
    () => {
      if (reducedMotion) return;
      if (!wrapper.current || !video.current) return;
      const videoEl = video.current;

      if (isMobile) {
        // No-op: this section's mobile rendering now lives inside
        // MobileStageRunA (see components/scroll/MobileStage.tsx and
        // MobileScene06.tsx). This desktop copy is CSS-hidden on mobile.
        return;
      }

      // Scrub the real footage frame-by-frame against scroll position,
      // pinned for the same duration the earlier drop/stain timeline used —
      // this is a video instead of a hand-built animation, but it should
      // still pace itself off scroll, not off its own clock.
      //
      // Built unconditionally, synchronously on mount — never gated behind
      // the video's own metadata loading. The pin itself (and the spacer
      // it inserts into the document) must exist regardless of video load
      // state; gating ScrollTrigger creation behind `loadedmetadata` meant
      // that if the video was slow to report metadata — or, per the
      // Chrome-automation tab's background-tab throttling (see
      // [[chrome_automation_video_throttling]]), never did — no pin-spacer
      // ever got created, so every section after this one had its scroll
      // position computed as if this section's pin didn't exist, and
      // visibly overlapped/collided with its neighbor once scrolled into.
      // Only the video's own currentTime-scrubbing needs to wait for
      // duration; guarded inline in onUpdate below instead (same fix
      // pattern used in Section02/03/04/07/10's own timelines).
      // Guards the write with an epsilon like Section02/03/04/05/10's own
      // timelines already do — this one was missing it, meaning every
      // scroll tick re-seeked the video even for a sub-frame-sized move.
      const FRAME_EPSILON = 1 / 30;

      const scrollTrigger = ScrollTrigger.create({
        trigger: container.current,
        start: "top top",
        end: "+=200%",
        pin: true,
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

      return () => {
        scrollTrigger.kill();
      };
    },
    { scope: container, dependencies: [reducedMotion, isMobile] }
  );
}
