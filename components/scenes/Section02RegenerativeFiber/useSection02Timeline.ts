"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { gsap, eases } from "@/lib/gsapConfig";

type Refs = {
  container: RefObject<HTMLElement | null>;
  video: RefObject<HTMLVideoElement | null>;
};

export function useSection02Timeline({ container, video }: Refs, reducedMotion: boolean, isMobile: boolean) {
  useGSAP(
    () => {
      const videoEl = video.current;
      if (!videoEl) return;

      if (reducedMotion) {
        // Resolved state, no animation: the fully-grown plant (final frame),
        // not the bare seed the clip opens on.
        const showFinalFrame = () => {
          if (videoEl.duration && !Number.isNaN(videoEl.duration)) {
            videoEl.currentTime = videoEl.duration;
          }
        };
        // Always deferred (never called synchronously here even when
        // metadata's already loaded) — a bare top-level call to a function
        // that mutates the video ref gets flagged by this project's React
        // Compiler lint rules; see [[eslint_react_compiler_immutability]].
        if (videoEl.readyState >= 1) setTimeout(showFinalFrame, 0);
        else videoEl.addEventListener("loadedmetadata", showFinalFrame, { once: true });
        return () => videoEl.removeEventListener("loadedmetadata", showFinalFrame);
      }

      if (isMobile) {
        // No-op: this section's mobile rendering now lives inside
        // MobileStageRunA (see components/scroll/MobileStage.tsx and
        // MobileScene02.tsx), which drives this video via the stage's own
        // per-scene progress instead of an independent pin here. This
        // desktop copy is CSS-hidden on mobile.
        return;
      }

      // The pin must exist regardless of whether the video's metadata has
      // loaded yet — gating ScrollTrigger creation itself behind
      // loadedmetadata means a slow (or, per the Chrome-automation-tab
      // background-throttling quirk, never-firing) load silently drops the
      // pin entirely (see [[chrome_automation_video_throttling]]). Only the
      // currentTime scrub needs to wait, guarded inline in onUpdate.
      gsap.set(videoEl, { opacity: 0 });

      // Encoded with a keyframe every 2 frames so arbitrary seeks stay cheap
      // (see [[scroll_scrub_video_keyframes]]); downscaled to 640x360 at
      // 15fps specifically because this clip carries a real alpha channel
      // (colorkeyed transparent WebM/VP9), which Chrome decodes in
      // software with no hardware acceleration path — at the original
      // 1280x720/24fps that per-frame decode cost was enough to visibly
      // stutter during scroll-scrub.
      const FRAME_EPSILON = 1 / 30;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          // Longer than Section03's own span — this clip's quieter early
          // beats (the seed dropping into the soil before it cracks) need
          // more scroll room to actually register, not just be technically
          // present in the footage between two faster scroll ticks.
          end: "+=420%",
          pin: true,
          scrub: 1.3,
          onUpdate: (self) => {
            const duration = videoEl.duration;
            if (!duration || Number.isNaN(duration)) return;
            const target = self.progress * duration;
            if (Math.abs(videoEl.currentTime - target) > FRAME_EPSILON) {
              videoEl.currentTime = target;
            }
          },
        },
      });

      tl.to(videoEl, { opacity: 1, duration: 0.6, ease: eases.water }, 0);
    },
    { scope: container, dependencies: [reducedMotion, isMobile] }
  );
}
