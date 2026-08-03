"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { gsap, eases } from "@/lib/gsapConfig";

type Refs = {
  container: RefObject<HTMLElement | null>;
  svg: RefObject<SVGSVGElement | null>;
  video: RefObject<HTMLVideoElement | null>;
  firstDot: RefObject<SVGCircleElement | null>;
  dots: RefObject<SVGGElement | null>;
  lines: RefObject<SVGGElement | null>;
};

export function useSection10Timeline(
  { container, video, firstDot, dots, lines }: Refs,
  reducedMotion: boolean,
  isMobile: boolean
) {
  useGSAP(
    () => {
      const videoEl = video.current;
      if (!videoEl || !firstDot.current || !dots.current || !lines.current) return;

      if (reducedMotion) {
        // Show the *resolved* state, no animation — same ethos as the dot
        // network under reduced motion (its own gsap.set hides below never
        // run, so it just renders at its natural full-opacity/scale
        // markup). For the video, "resolved" means the final frame (every
        // woman already joined hands), not the first (a single woman) —
        // set once metadata is available, whichever comes first.
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
        // MobileStageRunB (see components/scroll/MobileStage.tsx and
        // MobileScene10.tsx). This desktop copy is CSS-hidden on mobile.
        return;
      }

      // Built unconditionally, synchronously on mount — never gated behind
      // the video's own metadata loading. The dot-network reveal here is
      // independent of the video (it worked fine before the video even
      // existed in this section) and the pin itself must exist regardless
      // of video load state; making the *whole* timeline wait on
      // `loadedmetadata` (as an earlier pass here did, copying Section05's
      // pattern without noticing this section has independent content)
      // meant that if the video was slow to report metadata — or, as
      // found via the Chrome-automation tab's background-tab throttling
      // (see [[chrome_automation_video_throttling]]), never did — the pin
      // and the entire dot/line reveal silently never ran at all: no
      // pin-spacer ever got created, so the whole section just scrolled by
      // unpinned and unanimated. Only the video's own currentTime-scrubbing
      // needs to wait for duration; guarded inline in onUpdate below
      // instead, so it degrades gracefully (video just doesn't scrub yet)
      // without taking the pin or the dots/lines down with it.
      const dotEls = Array.from(dots.current.children);
      const lineEls = Array.from(lines.current.children) as SVGLineElement[];

      gsap.set(videoEl, { opacity: 0 });
      // Must match ImpactIllustration.tsx's NETWORK_CENTER exactly, or the
      // scale-from-0 reveal pivots around the wrong point and the dot
      // visibly drifts into place instead of just growing.
      gsap.set(firstDot.current, { scale: 0, transformOrigin: "300px 260px" });
      gsap.set(dotEls, { opacity: 0, scale: 0 });
      lineEls.forEach((line) => {
        const length = line.getTotalLength();
        gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
      });

      // The footage is encoded with a keyframe every 2 frames specifically
      // so arbitrary seeks stay cheap (see [[scroll_scrub_video_keyframes]]).
      const FRAME_EPSILON = 1 / 48;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: "+=240%",
          pin: true,
          scrub: 1,
          onUpdate: (self) => {
            const duration = videoEl.duration;
            if (!duration || Number.isNaN(duration)) return; // metadata not ready yet — skip this frame only
            const target = self.progress * duration;
            if (Math.abs(videoEl.currentTime - target) > FRAME_EPSILON) {
              videoEl.currentTime = target;
            }
          },
        },
      });

      // The video plays through as women join hands; the dot network
      // appears, multiplies, and traces its connections in the same
      // scroll span, echoing the same "joining together" idea twice.
      tl.to(videoEl, { opacity: 1, duration: 0.6, ease: eases.water }, 0)
        .to(firstDot.current, { scale: 1, duration: 0.5, ease: eases.fabric }, 0.4)
        .to(dotEls, { opacity: 1, scale: 1, duration: 0.5, ease: eases.fabric, stagger: 0.06 }, 1)
        .to(lineEls, { strokeDashoffset: 0, duration: 1, ease: eases.water, stagger: 0.03 }, 1.8);
    },
    { scope: container, dependencies: [reducedMotion, isMobile] }
  );
}
