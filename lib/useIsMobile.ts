"use client";

import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 768px), (pointer: coarse)";

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
