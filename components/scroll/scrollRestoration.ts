"use client";

import type Lenis from "lenis";

// ---------------------------------------------------------------------
// Scroll position restoration (QC2 O4)
// ---------------------------------------------------------------------
// The browser restores the old scroll offset (reload, back/forward) the
// moment the document is scrollable — long before the GSAP pin-spacers
// exist, so the page is still ~a third of its final height and the offset
// lands in the wrong scene (S07 reload → S04, back from /urunler → S02).
// Restoration is taken over: the position is saved per path in
// sessionStorage while scrolling, and re-applied only after the provider's
// hydration refresh (pins created and measured), then once more after the
// settled-layout refresh unless the reader has already moved. Only for
// reload / back-forward (document or client-side popstate); a hash always
// wins; a normal link navigation still starts at the top.
//
// Q8-1: moved out of SmoothScrollProvider.tsx unchanged, with NO runtime
// import of GSAP/ScrollTrigger/Lenis, so the sub-pages' provider
// (SubpageScrollProvider.tsx) can share it without shipping GSAP in their
// initial bundle. It must stay ONE module instance for every page: the
// popstate flag set here is consumed by whichever provider mounts next.
// The ScrollTrigger-specific parts (update + "refresh" event) are passed in
// by the caller as a `RestoreSync`.
const STORAGE_PREFIX = "hempact:scroll:";
const SAVE_THROTTLE_MS = 150;
const RESTORE_WINDOW_MS = 6000;

let popNavigationPending = false;
let initialNavigationHandled = false;
// Survives an effect re-run (e.g. isMobile/reducedMotion flipping right
// after mount): cleared only once the restore is settled, the reader
// interacts, or the window times out — not by effect cleanup.
// Q9-1: tied to the path it was read for. Browser toolbar Back/Forward and
// a synthetic/assistive-tech link activation send no input event to the
// page, so a pending home-page value (e.g. 5000) could outlive the home
// page and be applied to the next page (forward to /urunler → its bottom).
// A pending value for another path is dropped before anything else.
let pendingRestore: { path: string; y: number } | null = null;

if (typeof window !== "undefined") {
  try {
    window.history.scrollRestoration = "manual";
  } catch {
    // Not supported/allowed — falls back to the browser's own behavior.
  }
  window.addEventListener("popstate", () => {
    popNavigationPending = true;
  });
}

// How a restore re-syncs with the page's scroll-driven layout:
// `update` runs right after every applied position (ScrollTrigger.update on
// the home page); `onSettled` subscribes to the settled-layout refresh and
// returns an unsubscribe.
export type RestoreSync = {
  update: () => void;
  onSettled: (callback: () => void) => () => void;
};

function storageKey() {
  return STORAGE_PREFIX + window.location.pathname;
}

function readSavedPosition(): number | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey());
    const value = raw == null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function startSavingScrollPosition() {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    timeoutId = undefined;
    try {
      window.sessionStorage.setItem(storageKey(), String(Math.round(window.scrollY)));
    } catch {
      // Storage full/blocked: restoration just won't happen.
    }
  };
  const onScroll = () => {
    if (!timeoutId) timeoutId = setTimeout(save, SAVE_THROTTLE_MS);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("pagehide", save);
  return () => {
    if (timeoutId) clearTimeout(timeoutId);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("pagehide", save);
  };
}

function shouldRestore() {
  if (popNavigationPending) {
    popNavigationPending = false;
    initialNavigationHandled = true;
    return true;
  }
  if (initialNavigationHandled) return false;
  initialNavigationHandled = true;
  const entry = performance.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
  return entry?.type === "reload" || entry?.type === "back_forward";
}

// `topWhenNothingSaved` (sub-pages only): a back/forward/reload to a page
// with no saved position (or a saved 0) lands at the top. Without it the
// page keeps the previous page's offset, clamped to its own height (forward
// from the home page at y 9000 to /urunler → its bottom). On the home page
// ScrollTrigger.refresh() (scroll(0) while measuring) has the same effect;
// the sub-pages used to get it from the same refresh before Q8-1.
export function restoreScrollPosition(
  lenis: Lenis | null,
  sync: RestoreSync,
  { topWhenNothingSaved = false }: { topWhenNothingSaved?: boolean } = {}
) {
  const path = window.location.pathname;
  if (pendingRestore && pendingRestore.path !== path) pendingRestore = null;
  // Always consume the navigation flag, even when a hash wins below.
  const wanted = pendingRestore == null && shouldRestore();
  if (window.location.hash) {
    pendingRestore = null;
    return undefined;
  }
  if (wanted) {
    const saved = readSavedPosition();
    pendingRestore = saved != null && saved > 0 ? { path, y: saved } : null;
    if (pendingRestore == null && topWhenNothingSaved && window.scrollY !== 0) window.scrollTo(0, 0);
  }
  if (pendingRestore == null) return undefined;
  const { y } = pendingRestore;

  const apply = () => {
    if (lenis) {
      lenis.resize();
      lenis.scrollTo(y, { immediate: true, force: true });
    } else {
      window.scrollTo(0, y);
    }
    sync.update();
  };
  apply();

  // One more pass after the settled-layout refresh (fonts/load), unless
  // the reader has already taken over.
  let detached = false;
  const userEvents = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
  const detach = () => {
    if (detached) return;
    detached = true;
    clearTimeout(windowId);
    offSettled();
    userEvents.forEach((type) => window.removeEventListener(type, settle, { capture: true }));
  };
  const settle = () => {
    pendingRestore = null;
    detach();
  };
  const onSettled = () => {
    if (Math.abs(window.scrollY - y) > 1) apply();
    settle();
  };
  const windowId = setTimeout(settle, RESTORE_WINDOW_MS);
  const offSettled = sync.onSettled(onSettled);
  userEvents.forEach((type) => window.addEventListener(type, settle, { passive: true, capture: true }));
  // Effect cleanup only detaches; a re-run picks the pending restore up.
  return detach;
}

// The sub-pages' stand-in for lib/gsapConfig.ts's settled-layout refresh:
// the same "window loaded AND web fonts settled, then one rAF" moment,
// without ScrollTrigger.
export function onLayoutSettled(callback: () => void) {
  let cancelled = false;
  let frameId = 0;
  const windowLoaded =
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));
  const fontsReady = document.fonts?.ready.then(() => undefined).catch(() => undefined) ?? Promise.resolve();
  Promise.all([windowLoaded, fontsReady]).then(() => {
    if (!cancelled) frameId = requestAnimationFrame(() => callback());
  });
  return () => {
    cancelled = true;
    cancelAnimationFrame(frameId);
  };
}
