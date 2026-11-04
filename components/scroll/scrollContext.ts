"use client";

import { createContext, useContext } from "react";
import type Lenis from "lenis";

// Lightweight half of SmoothScrollProvider: just the React context and the
// `useScrollToSection` hook, with NO runtime import of GSAP, ScrollTrigger
// or Lenis (`import type` is erased at compile time). NavBar renders on
// every page and only needs this hook; importing it from
// SmoothScrollProvider.tsx used to drag GSAP + ScrollTrigger + Lenis into
// NavBar's own client chunk, so the same ~53 KB gzip library code shipped
// twice on the home page (NavBar's chunk + the page's chunk) — confirmed in
// the Faz 1 build output (docs/scroll-performans-raporu.md, bulgu #13).
// SmoothScrollProvider imports `LenisContext` from here and re-exports
// `useScrollToSection`, so existing call sites keep working unchanged.
export const LenisContext = createContext<React.RefObject<Lenis | null> | null>(null);

// Matches the fixed header's height plus breathing room.
const SCROLL_OFFSET = -88;

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
      // every scroll; see SmoothScrollProvider's mount effect for the
      // fuller writeup.
      lenis.resize();
      lenis.scrollTo(target, { offset: SCROLL_OFFSET, duration: 1.4 });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
}
