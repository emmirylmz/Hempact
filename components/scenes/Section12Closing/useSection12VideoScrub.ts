"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { ScrollTrigger } from "@/lib/gsapConfig";

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

      let scrollTrigger: ScrollTrigger | undefined;
      // "loadedmetadata" can fire after this effect has already been torn
      // down (dependency change / unmount) — without this guard, setup()
      // would still create a ScrollTrigger that nothing goes on to kill.
      let cancelled = false;

      // Guards the write with an epsilon like Section02/03/04/05/10's own
      // timelines already do — this one was missing it.
      const FRAME_EPSILON = 1 / 30;

      const setup = () => {
        if (cancelled) return;
        const duration = videoEl.duration;
        if (!duration || Number.isNaN(duration)) return;

        scrollTrigger = ScrollTrigger.create({
          trigger: container.current,
          start: "top top",
          end: "+=150%",
          pin: true,
          anticipatePin: 1,
          scrub: 0.5,
          onUpdate: (self) => {
            const target = self.progress * duration;
            if (Math.abs(videoEl.currentTime - target) > FRAME_EPSILON) {
              videoEl.currentTime = target;
            }
          },
        });
      };

      if (videoEl.readyState >= 1) {
        setup();
      } else {
        videoEl.addEventListener("loadedmetadata", setup, { once: true });
      }

      return () => {
        cancelled = true;
        scrollTrigger?.kill();
        videoEl.removeEventListener("loadedmetadata", setup);
      };
    },
    { scope: container, dependencies: [reducedMotion, isMobile] }
  );
}
