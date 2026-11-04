"use client";

import { useEffect, type DependencyList, type RefObject } from "react";

// Q8-1: GSAP (+ ScrollTrigger) for the sub-pages (/hakkimizda, /iletisim,
// /urunler), loaded with a dynamic import instead of a static one.
//
// Why: a static `import { gsap } from "@/lib/gsapConfig"` puts GSAP +
// ScrollTrigger (and, through the old shared provider, Lenis) into the
// page's initial client bundle; Turbopack evaluates those modules inside
// the hydration task, and every useGSAP setup and ScrollTrigger.create ran
// in the same task (mobile 4x: GSAP ~90-130 ms of a 180-280 ms task; it was
// most of /hakkimizda's and /iletisim's TBT). These pages have no pins and
// no scrub-to-video — only entrance tweens, "top 70%" reveals and the
// background color flow — so none of it has to block hydration.
//
// This file has NO runtime import of GSAP: `import type` is erased. The home
// page keeps its static imports (scenes need GSAP during hydration for the
// pins); when a sub-page is reached by client navigation from the home page,
// the dynamic import resolves to the same, already evaluated module.
type GsapModule = typeof import("./gsapConfig");
type GsapContext = ReturnType<GsapModule["gsap"]["context"]>;

let gsapPromise: Promise<GsapModule> | null = null;

export function loadGsap(): Promise<GsapModule> {
  // Q9-5: a failed chunk load (network drop, stale tab after a deploy) is
  // not cached, so a later mount can retry; callers swallow the rejection
  // and the server-rendered (final, visible) markup simply stays.
  if (!gsapPromise)
    gsapPromise = import("./gsapConfig").catch((error) => {
      gsapPromise = null;
      throw error;
    });
  return gsapPromise;
}

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

// Same as lib/idleGsap.ts's scheduleIdle (that module imports GSAP
// statically, so it can't be used here): requestIdleCallback with a cancel
// handle, timeout fallback where there is none (iOS Safari).
export function scheduleIdle(cb: () => void, timeout: number): () => void {
  const w = window as IdleWindow;
  if (w.requestIdleCallback && w.cancelIdleCallback) {
    const id = w.requestIdleCallback(cb, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = setTimeout(cb, 50);
  return () => clearTimeout(id);
}

// A new macrotask: everything chained on the import() promise runs in ONE
// task (the module evaluation's), so each setup is moved into its own.
function scheduleTask(cb: () => void): () => void {
  const id = setTimeout(cb, 0);
  return () => clearTimeout(id);
}

export type LazyGsapTiming = "next" | "idle";

// Like useGSAP, but GSAP is imported on demand and `setup` runs in its own
// task after the import resolves: `"next"` as soon as possible (first-screen
// entrance animations), `"idle"` in an idle callback (below-the-fold
// reveals, background flow). Animations and ScrollTriggers created in
// `setup` are collected by a gsap.context scoped to `scope` and reverted on
// cleanup/dependency change, exactly like useGSAP; a function returned by
// `setup` runs on revert too. Until `setup` runs, the server-rendered markup
// (final, visible state) is what shows.
export function useLazyGsap(
  setup: (m: GsapModule) => void | (() => void),
  scope: RefObject<Element | null>,
  dependencies: DependencyList,
  { enabled = true, timing = "next", timeout = 1500 }: { enabled?: boolean; timing?: LazyGsapTiming; timeout?: number } = {}
) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let cancelScheduled: (() => void) | null = null;
    let ctx: GsapContext | null = null;
    loadGsap().then((m) => {
      if (cancelled) return;
      const run = () => {
        cancelScheduled = null;
        if (cancelled) return;
        ctx = m.gsap.context(() => setup(m), scope.current ?? undefined);
      };
      cancelScheduled = timing === "idle" ? scheduleIdle(run, timeout) : scheduleTask(run);
    }).catch(() => {});
    return () => {
      cancelled = true;
      cancelScheduled?.();
      ctx?.revert();
    };
    // `setup` is intentionally not a dependency (same contract as useGSAP's
    // `dependencies`): it is re-created every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, timing, timeout, ...dependencies]);
}

// lib/useSceneBackgroundFlow.ts's hook for the sub-pages: the same shared
// registry/compositor (one module instance, so a client navigation from the
// home page shares it as before) and the same "top center" → "bottom
// center" scrubbed trigger, registered in an idle callback once GSAP has
// loaded. Before that the layer keeps the page's BackgroundFlow
// `initialColor`. On /hakkimizda and /iletisim the first section uses that
// same color, so nothing visibly changes until the reader scrolls; on
// /urunler (softIvory over a warmLinen initial color) the layer switches
// when the entry registers (pre-existing, QC9 Q9-3).
export function useLazySceneBackgroundFlow(sectionRef: RefObject<HTMLElement | null>, color: string) {
  useEffect(() => {
    let cancelled = false;
    let cancelScheduled: (() => void) | null = null;
    let cleanup: (() => void) | null = null;
    Promise.all([loadGsap(), import("./useSceneBackgroundFlow")]).then(([{ ScrollTrigger }, { createBackgroundFlowEntry }]) => {
      if (cancelled) return;
      cancelScheduled = scheduleIdle(() => {
        cancelScheduled = null;
        const el = sectionRef.current;
        if (cancelled || !el) return;
        const entry = createBackgroundFlowEntry(el, color);
        const trigger = ScrollTrigger.create({
          trigger: el,
          start: "top center",
          end: "bottom center",
          scrub: true,
          onUpdate: (self) => entry.setProgress(self.progress),
        });
        cleanup = () => {
          trigger.kill();
          entry.destroy();
        };
      }, 1500);
    }).catch(() => {});
    return () => {
      cancelled = true;
      cancelScheduled?.();
      cleanup?.();
    };
  }, [sectionRef, color]);
}

// Starts the GSAP download without waiting for an effect: called at module
// scope by the sub-pages' first-screen components, so the request is issued
// while the page is still hydrating instead of after it.
export function preloadGsap() {
  if (typeof window !== "undefined") void loadGsap();
}
