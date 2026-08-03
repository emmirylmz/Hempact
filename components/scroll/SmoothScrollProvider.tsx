"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, registerGsap } from "@/lib/gsapConfig";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useIsMobile } from "@/lib/useIsMobile";

const LenisContext = createContext<React.RefObject<Lenis | null> | null>(null);

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
    //    first; the same call is in useScrollToSection below for the same
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

    if (reducedMotion || isMobile) {
      ScrollTrigger.refresh();
      scrollToHashTarget(null);
      return () => {
        if (hashTimeoutId) clearTimeout(hashTimeoutId);
      };
    }

    const lenis = new Lenis({ duration: 1.2, smoothWheel: true });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);

    ScrollTrigger.refresh();
    scrollToHashTarget(lenis);

    return () => {
      if (hashTimeoutId) clearTimeout(hashTimeoutId);
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reducedMotion, isMobile]);

  return <LenisContext.Provider value={lenisRef}>{children}</LenisContext.Provider>;
}

export function useScrollToSection() {
  const lenisRef = useContext(LenisContext);

  return (sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;

    const lenis = lenisRef?.current;
    if (lenis) {
      // Lenis caches its own max-scroll `limit` and only recalculates it on
      // a native window resize — this page's height keeps growing after
      // load purely from GSAP pin-spacers being inserted, which never fires
      // one, so scrollTo can silently clamp short of a target that only
      // exists further down than Lenis last measured. Cheap to call before
      // every scroll; see the fuller writeup on this in the effect above.
      lenis.resize();
      lenis.scrollTo(target, { offset: -88, duration: 1.4 });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
}
