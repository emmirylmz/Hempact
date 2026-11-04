"use client";

import { useEffect, useRef } from "react";
import type Lenis from "lenis";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useIsMobile } from "@/lib/useIsMobile";
import { scheduleIdle } from "@/lib/lazyGsap";
import { LenisContext } from "./scrollContext";
import { onLayoutSettled, restoreScrollPosition, startSavingScrollPosition, type RestoreSync } from "./scrollRestoration";

// Q8-1: the sub-pages' (/hakkimizda, /iletisim, /urunler) counterpart of
// SmoothScrollProvider, without GSAP or Lenis in the initial bundle.
//
// - Scroll restoration: the same shared module (./scrollRestoration.ts) as
//   the home page; these pages have no pin-spacers, so there is no
//   ScrollTrigger refresh to wait for — the position is applied at mount
//   and once more after window load + web fonts (same moment as the home
//   page's settled-layout refresh).
// - Lenis: desktop pointer only, as before (off on touch screens at any
//   width, docs/mobil.md). Loaded in an idle callback after first paint
//   (./lenisDriver.ts, the same driver as the home page), so the first
//   wheel ticks before that scroll natively.
// - GSAP itself is loaded by the page's own components (lib/lazyGsap.ts).
const SUBPAGE_RESTORE_SYNC: RestoreSync = {
  update: () => {},
  onSettled: onLayoutSettled,
};

export function SubpageScrollProvider({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Same hash handling as SmoothScrollProvider (no sub-page link uses a
    // hash today); before Lenis has loaded, a native jump.
    let hashTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const hash = window.location.hash.slice(1);
    if (hash) {
      hashTimeoutId = setTimeout(() => {
        const target = document.getElementById(hash);
        if (!target) return;
        const lenis = lenisRef.current;
        if (lenis) {
          lenis.resize();
          lenis.scrollTo(target, { offset: -88, duration: 1.4 });
        } else {
          target.scrollIntoView({ block: "start" });
        }
      }, 100);
    }

    const stopSaving = startSavingScrollPosition();
    const stopRestore = restoreScrollPosition(null, SUBPAGE_RESTORE_SYNC, { topWhenNothingSaved: true });

    let cancelled = false;
    let cancelIdle: (() => void) | null = null;
    let stopLenis: (() => void) | null = null;
    const touchPrimary = window.matchMedia("(pointer: coarse)").matches;
    if (!(reducedMotion || isMobile || touchPrimary)) {
      cancelIdle = scheduleIdle(() => {
        cancelIdle = null;
        import("./lenisDriver").then(({ startLenis }) => {
          if (cancelled) return;
          const driver = startLenis();
          lenisRef.current = driver.lenis;
          stopLenis = driver.stop;
        })
          // Q9-5: chunk failed to load — native scrolling stays.
          .catch(() => {});
      }, 2000);
    }

    return () => {
      cancelled = true;
      if (hashTimeoutId) clearTimeout(hashTimeoutId);
      cancelIdle?.();
      stopRestore?.();
      stopSaving();
      stopLenis?.();
      lenisRef.current = null;
    };
  }, [reducedMotion, isMobile]);

  return <LenisContext.Provider value={lenisRef}>{children}</LenisContext.Provider>;
}
