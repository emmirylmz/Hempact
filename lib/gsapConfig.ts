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

  // Startup refresh budget (bulgu #7): there used to be THREE full
  // refreshes at startup — SmoothScrollProvider's mount refresh,
  // ScrollTrigger's own built-in `load` auto-refresh, and a second `load`
  // listener here — the last two back to back in one ~220 ms task (4x CPU).
  // Now ScrollTrigger's own DOMContentLoaded/load auto-refreshes are turned
  // off (resize + visibilitychange stay) and replaced by exactly one
  // refresh below, so startup costs two: provider mount + settled layout.
  //
  // The protection the old listener existed for is kept: every trigger's
  // start/end is measured against the DOM as it exists when it's created
  // (pins are created synchronously at mount, see
  // [[mobile_scroll_architecture]]), and still-loading fonts/images can
  // keep shifting layout after that — so once the window has loaded AND
  // web fonts have settled, one forced `refresh()` re-measures every
  // trigger against the final layout ("pin'ler geç oluşursa kayma").
  //
  // `autoRefreshEvents` is only safe to set once ScrollTrigger's core has
  // initialised (it needs <body>); if it hasn't, the defaults stay and the
  // worst case is the old behavior (one extra refresh), never a missing one.
  if (document.body) {
    ScrollTrigger.config({ autoRefreshEvents: "visibilitychange,resize" });
  }
  scheduleSettledRefresh();
  registered = true;
}

function scheduleSettledRefresh() {
  const windowLoaded =
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));
  const fontsReady = document.fonts?.ready.then(() => undefined).catch(() => undefined) ?? Promise.resolve();

  // One rAF after both settle: batches with whatever else the `load`
  // handlers themselves changed, and keeps this out of the load task.
  Promise.all([windowLoaded, fontsReady]).then(() => {
    requestAnimationFrame(() => ScrollTrigger.refresh());
  });
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
