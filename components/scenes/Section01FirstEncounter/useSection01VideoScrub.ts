"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { ScrollTrigger } from "@/lib/gsapConfig";

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

      let scrollTrigger: ScrollTrigger | undefined;
      // "loadedmetadata" can fire after this effect has already been torn
      // down (dependency change / unmount) — without this guard, setup()
      // would still create a ScrollTrigger that nothing goes on to kill.
      let cancelled = false;

      // Every other desktop section's own scrub timeline guards its
      // `currentTime` write with an epsilon like this (see e.g.
      // useSection02Timeline.ts) — this one didn't, meaning every scroll
      // tick re-seeked the video even for a sub-frame-sized move. A real,
      // if minor, contributor to desktop scroll jank; see
      // [[mobile_unified_stage_architecture]] for the mobile-side version
      // of this same fix.
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
