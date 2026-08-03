"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsapConfig";

type Refs = {
  container: RefObject<HTMLElement | null>;
  video: RefObject<HTMLVideoElement | null>;
  sheen: RefObject<HTMLDivElement | null>;
  glow: RefObject<HTMLDivElement | null>;
};

export function useSection07Timeline(
  { container, video, sheen, glow }: Refs,
  reducedMotion: boolean,
  isMobile: boolean
) {
  useGSAP(
    () => {
      if (reducedMotion) return;
      if (!video.current || !sheen.current) return;
      const videoEl = video.current;
      const sheenEl = sheen.current;

      if (isMobile) {
        // No-op: this section's mobile rendering now lives inside
        // MobileStageRunA (see components/scroll/MobileStage.tsx and
        // MobileScene07.tsx). This desktop copy is CSS-hidden on mobile.
        return;
      }

      gsap.set(sheenEl, { xPercent: -160, opacity: 0.5 });

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
      // duration; guarded inline in onUpdate below instead, so it degrades
      // gracefully (video just doesn't scrub yet) without taking the pin
      // or the sheen sweep down with it (same fix pattern used in
      // Section02/03/04/10's own timelines).
      // Guards the write with an epsilon like Section02/03/04/05/10's own
      // timelines already do — this one was missing it.
      const FRAME_EPSILON = 1 / 30;

      const scrollTrigger = ScrollTrigger.create({
        trigger: container.current,
        start: "top top",
        end: "+=220%",
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
          const duration = videoEl.duration;
          if (duration && !Number.isNaN(duration)) {
            const target = self.progress * duration;
            if (Math.abs(videoEl.currentTime - target) > FRAME_EPSILON) {
              videoEl.currentTime = target;
            }
          }
          gsap.set(sheenEl, { xPercent: -160 + self.progress * 320 });
        },
      });

      const glowEl = glow.current;
      let onMouseMove: ((event: MouseEvent) => void) | undefined;
      let onMouseLeave: (() => void) | undefined;

      if (glowEl) {
        const quickX = gsap.quickTo(glowEl, "x", { duration: 0.5, ease: "power3.out" });
        const quickY = gsap.quickTo(glowEl, "y", { duration: 0.5, ease: "power3.out" });
        onMouseMove = (event: MouseEvent) => {
          const rect = container.current?.getBoundingClientRect();
          if (!rect) return;
          quickX(event.clientX - rect.left);
          quickY(event.clientY - rect.top);
          gsap.to(glowEl, { opacity: 0.5, duration: 0.3 });
        };
        onMouseLeave = () => gsap.to(glowEl, { opacity: 0, duration: 0.5 });
        container.current?.addEventListener("mousemove", onMouseMove);
        container.current?.addEventListener("mouseleave", onMouseLeave);
      }

      return () => {
        scrollTrigger.kill();
        if (onMouseMove) container.current?.removeEventListener("mousemove", onMouseMove);
        if (onMouseLeave) container.current?.removeEventListener("mouseleave", onMouseLeave);
      };
    },
    { scope: container, dependencies: [reducedMotion, isMobile] }
  );
}
