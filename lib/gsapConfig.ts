import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function registerGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.ticker.lagSmoothing(0);
  // Mobile browsers fire `resize` when their address bar shows/hides
  // during scroll (not just on real orientation/window changes) — without
  // this, ScrollTrigger would treat every one of those as a layout change
  // and re-measure all trigger positions mid-scroll, which is both
  // wasteful and can itself introduce jitter. Combined with `dvh` (see
  // components/scroll/SceneWrapper.tsx) tracking the true visible
  // viewport at the CSS level, ScrollTrigger no longer needs to react to
  // this class of resize at all.
  ScrollTrigger.config({ ignoreMobileResize: true });

  // A safety net for the 9 sections that pin themselves once their own
  // video's metadata loads (each on its own network-dependent schedule) —
  // every trigger's start/end is measured against the DOM as it exists at
  // that moment, and while pin creation itself is synchronous (see
  // [[mobile_scroll_architecture]]), still-loading fonts/images elsewhere
  // on the page can keep shifting layout for a bit after that. One
  // `refresh()` once everything (including media) has actually finished
  // loading re-measures every trigger against the final, settled layout —
  // cheap, and standard GSAP guidance for pages with this many pinned,
  // asynchronously-sized sections.
  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  registered = true;
}

export const eases = {
  water: "power2.inOut",
  breath: "sine.inOut",
  fabric: "power3.out",
  growth: "power4.in",
} as const;

// Registered at module load so plugin availability never depends on effect/mount order
// across components (child effects run before parent effects, so relying on a provider's
// own effect to register the plugin in time is not reliable).
registerGsap();

export { gsap, ScrollTrigger };
