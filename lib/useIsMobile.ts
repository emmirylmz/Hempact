"use client";

import { useEffect, useState } from "react";

// Must be the exact complement of the CSS breakpoint every scene uses to
// pick its copy (Tailwind `md:` = min-width 48rem = 768px; see the
// `md:hidden` / `hidden md:contents` wrappers and MOBILE_SOURCE_MEDIA in
// lib/mobileMedia.ts). The JS side decides which GSAP structure is built
// (mobile stage pins vs desktop section pins), the CSS side decides which
// copy is visible; any viewport where the two disagree gets neither (no
// pins at all, page ~14k px instead of 33k). The old query also matched
// `(pointer: coarse)` and 768px exactly: a touch screen at >= 768px (tablet,
// phone in landscape, a touch laptop, or a resized touch-emulating window)
// showed the desktop copy without its pins. Touch-specific behaviour
// (no Lenis on touch screens) is decided separately in SmoothScrollProvider.
const MOBILE_QUERY = "(max-width: 767.98px)";

function computeIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

// Deliberately a plain useState + lazy initializer, not useSyncExternalStore.
// useSyncExternalStore is the right tool when a value affects rendered JSX
// (it forces the client's first render to match the server's, then
// schedules a correction) — but that correction is exactly the problem
// here: every GSAP setup effect below this hook keys off `isMobile`, and a
// "runs once as false (desktop), cleans up, runs again as true (mobile)"
// cycle meant desktop-only setup (pin:true, `gsap.set(el, {opacity:0})`
// pending its own reveal timeline) could execute — however briefly — on an
// actual phone before being torn down, leaving stale opacity/pin-spacer
// side effects behind (see [[mobile_video_playback_fixes]]). Nothing in
// this codebase branches its rendered JSX on `isMobile` anymore (the
// mobile/desktop split is CSS-media-query-driven, e.g. Section05's own
// `md:hidden` fallback list), so there's nothing for a hydration mismatch
// to catch — the lazy initializer runs fresh on the client during
// hydration and reads the real `matchMedia` value immediately, correct
// from the very first effect run, no race.
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(computeIsMobile);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
