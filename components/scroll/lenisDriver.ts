"use client";

import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsapConfig";

// Lenis smooth scrolling driven from gsap.ticker, shared by the home page's
// SmoothScrollProvider (static import) and the sub-pages'
// SubpageScrollProvider (dynamic import, after first paint) — Q8-1. Moved
// out of SmoothScrollProvider.tsx unchanged.
//
// Lenis only needs frames while it is itself animating a scroll (wheel
// smoothing or a programmatic scrollTo). Keeping its raf permanently on
// gsap.ticker kept GSAP's rAF loop awake on an idle page forever
// (QC2 K7). Now the tick sleeps after IDLE_FRAMES quiet frames — GSAP's
// own autoSleep then stops the loop when no tween is running — and wakes
// on any input that can start a Lenis scroll. Scroll feel is unchanged:
// the frame that processes a wheel event is the same next frame as
// before, and `lenis.time` is reset on wake so the first delta is 0
// (otherwise the sleep gap would read as one huge frame and snap).
export function startLenis() {
  const lenis = new Lenis({ duration: 1.2, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);

  const IDLE_FRAMES = 30;
  let idleFrames = 0;
  let awake = false;
  const tick = (time: number) => {
    lenis.raf(time * 1000);
    if (lenis.isScrolling === "smooth") {
      idleFrames = 0;
    } else if (++idleFrames > IDLE_FRAMES) {
      gsap.ticker.remove(tick);
      awake = false;
    }
  };
  const wake = () => {
    idleFrames = 0;
    if (awake) return;
    awake = true;
    lenis.time = 0;
    gsap.ticker.add(tick);
  };
  const offVirtualScroll = lenis.on("virtual-scroll", wake);
  const wakeEvents = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
  wakeEvents.forEach((type) => window.addEventListener(type, wake, { passive: true, capture: true }));
  const originalScrollTo = lenis.scrollTo.bind(lenis);
  lenis.scrollTo = ((...args: Parameters<Lenis["scrollTo"]>) => {
    wake();
    return originalScrollTo(...args);
  }) as Lenis["scrollTo"];
  wake();

  const stop = () => {
    offVirtualScroll();
    wakeEvents.forEach((type) => window.removeEventListener(type, wake, { capture: true }));
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
  return { lenis, stop };
}

// The ScrollTrigger side of scroll restoration on the home page.
export const scrollTriggerRestoreSync = {
  update: () => ScrollTrigger.update(),
  onSettled: (callback: () => void) => {
    ScrollTrigger.addEventListener("refresh", callback);
    return () => ScrollTrigger.removeEventListener("refresh", callback);
  },
};
