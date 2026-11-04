"use client";

import { useEffect, useRef } from "react";
import type Lenis from "lenis";
import { ScrollTrigger, registerGsap } from "@/lib/gsapConfig";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useIsMobile } from "@/lib/useIsMobile";
import { LenisContext } from "./scrollContext";
import { startLenis, scrollTriggerRestoreSync } from "./lenisDriver";
import { restoreScrollPosition, startSavingScrollPosition } from "./scrollRestoration";

// Re-exported for backward compatibility (MobileScene12 and others import it
// from here). Code that doesn't need the provider itself — NavBar in
// particular — imports from "./scrollContext" instead, so it doesn't pull
// GSAP + Lenis into its own client chunk (bulgu #13).
export { useScrollToSection } from "./scrollContext";

// Home page only (app/[lang]/page.tsx). Scroll position restoration
// (QC2 O4) lives in ./scrollRestoration.ts and the Lenis + gsap.ticker
// driver in ./lenisDriver.ts, both moved out of this file unchanged (Q8-1)
// so the sub-pages' SubpageScrollProvider can share them without loading
// GSAP + Lenis up front.

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    registerGsap();

    // A link from another page (e.g. /hakkimizda's NavBar links) lands here
    // as a plain "/#sectionId" navigation. Two separate problems had to be
    // fixed for this to land in the right place:
    //
    // 1. Next.js's own default <Link> scroll-to-hash behavior measures the
    //    target's position too early — before this page's own pin-spacers
    //    (inserted by each section's GSAP ScrollTrigger) exist — and lands
    //    short. Callers must pass `scroll={false}` on any <Link> to a hash
    //    on another page so Next's own scroll never fires; this effect's
    //    own corrected scroll (below) is the only thing that should move
    //    the page.
    // 2. Lenis caches its own max-scroll `limit` and only recalculates it on
    //    a native window `resize` event — a page growing taller purely from
    //    React rendering pinned sections never fires one, so a scrollTo can
    //    silently clamp short of a target that only exists further down
    //    than Lenis last measured. `lenis.resize()` forces a remeasure
    //    first; the same call is in useScrollToSection (./scrollContext.ts) for the same
    //    reason.
    let hashTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const scrollToHashTarget = (lenis: Lenis | null) => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      hashTimeoutId = setTimeout(() => {
        const target = document.getElementById(hash);
        if (!target) return;
        if (lenis) {
          lenis.resize();
          lenis.scrollTo(target, { offset: -88, duration: 1.4 });
        } else {
          target.scrollIntoView({ block: "start" });
        }
      }, 100);
    };

    // The single hydration-time refresh. Every pinned ScrollTrigger created
    // in the children's (earlier-running) effects queues its own rAF
    // refresh; this synchronous one supersedes that queue (ScrollTrigger
    // drops a queued refresh once another one has run). The only other
    // startup refresh is the settled-layout one scheduled in
    // lib/gsapConfig.ts (fonts + window load) — two in total, not three.
    const stopSaving = startSavingScrollPosition();

    // Lenis stays off on touch screens at any width (docs/mobil.md: native
    // scrolling on touch devices). Width alone decides mobile vs desktop
    // structure (lib/useIsMobile.ts), so a touch tablet at >= 768px gets the
    // desktop pins with native scrolling.
    const touchPrimary = window.matchMedia("(pointer: coarse)").matches;
    if (reducedMotion || isMobile || touchPrimary) {
      ScrollTrigger.refresh();
      const stopRestore = restoreScrollPosition(null, scrollTriggerRestoreSync);
      scrollToHashTarget(null);
      return () => {
        if (hashTimeoutId) clearTimeout(hashTimeoutId);
        stopRestore?.();
        stopSaving();
      };
    }

    const { lenis, stop: stopLenis } = startLenis();
    lenisRef.current = lenis;

    ScrollTrigger.refresh();
    const stopRestore = restoreScrollPosition(lenis, scrollTriggerRestoreSync);
    scrollToHashTarget(lenis);

    return () => {
      if (hashTimeoutId) clearTimeout(hashTimeoutId);
      stopRestore?.();
      stopSaving();
      stopLenis();
      lenisRef.current = null;
    };
  }, [reducedMotion, isMobile]);

  return <LenisContext.Provider value={lenisRef}>{children}</LenisContext.Provider>;
}
