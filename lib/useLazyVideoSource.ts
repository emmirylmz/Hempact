"use client";

import { useReloadWhenSourceMatches } from "@/lib/videoSourceMatch";
import { useEffect, useState, type RefObject } from "react";

// All 9 desktop scroll-scrub videos (~36MB total) used to render their
// `<source>` unconditionally, so `preload="auto"` made every one of them
// start downloading in full the moment the page loaded, regardless of
// scroll position — 9 simultaneous multi-MB fetches competing for the same
// connection pool right at first paint. Reverting to `preload="metadata"`
// isn't an option here: that was already tried and reverted (see
// [[mobile_scroll_architecture]]) because on-demand network seeks during
// scroll-scrub feel visibly disconnected from the scroll. The actual fix
// that memory landed on but never implemented: keep `preload="auto"`, just
// delay *starting* it per-section until the section is actually
// approaching, via IntersectionObserver — same eager local buffering once
// triggered, no simultaneous page-load stampede.
//
// `rootMargin` gives enough scroll runway (in viewport-heights) for the
// video to finish buffering before the user's scroll position actually
// reaches it — every pinned section here spans at least 150% of a
// viewport's worth of scroll, so a margin this size still leaves real lead
// time even on a slow connection.
const DEFAULT_ROOT_MARGIN = "150% 0px";

// Startup ordering (Faz 1 ölçümü, rapor 1.6): Section02 sits inside the
// 150% margin at page load, so its video used to start downloading at
// ~430 ms while the hero's own video only started at ~2.2 s — the
// off-screen scene beat the on-screen one to the network. The hero source
// is now in the server HTML (QC2 K2), and every lazy video additionally
// waits for (a) the hero video to be playable (`canplay`; or a safety
// timeout, in case it never is — e.g. a mobile viewport, where the desktop
// hero source doesn't match), then (b) window `load`, then (c) an idle
// slot. Scroll-driven behavior after startup is unchanged: once that gate
// has opened, a section's source mounts as soon as it's within the margin.
const HERO_WAIT_TIMEOUT_MS = 3000;
const IDLE_TIMEOUT_MS = 1500;

let heroStarted = false;
const heroListeners = new Set<() => void>();

// Called by Section01FirstEncounter once the hero video fires `canplay`.
// Posters: call sites bind `poster` only once `isNear` is true (QC2 K3) —
// the CSS-hidden desktop copies on mobile never intersect, so they never
// fetch one.
export function markHeroMediaStarted() {
  if (heroStarted) return;
  heroStarted = true;
  heroListeners.forEach((listener) => listener());
  heroListeners.clear();
}

let startupGate: Promise<void> | null = null;

function waitForStartupGate(): Promise<void> {
  if (startupGate) return startupGate;

  const heroReady = new Promise<void>((resolve) => {
    if (heroStarted) return resolve();
    const timeoutId = setTimeout(resolve, HERO_WAIT_TIMEOUT_MS);
    heroListeners.add(() => {
      clearTimeout(timeoutId);
      resolve();
    });
  });
  const windowLoaded = new Promise<void>((resolve) => {
    if (document.readyState === "complete") return resolve();
    window.addEventListener("load", () => resolve(), { once: true });
  });

  startupGate = Promise.all([heroReady, windowLoaded]).then(
    () =>
      new Promise<void>((resolve) => {
        if (typeof window.requestIdleCallback === "function") {
          window.requestIdleCallback(() => resolve(), { timeout: IDLE_TIMEOUT_MS });
        } else {
          setTimeout(resolve, 0);
        }
      })
  );
  return startupGate;
}

// Media query of every desktop copy's `<source>` (complement of
// MOBILE_SOURCE_MEDIA in lib/mobileMedia.ts).
export const DESKTOP_SOURCE_MEDIA = "(min-width: 768px)";

export function useLazyVideoSource(
  container: RefObject<Element | null>,
  video: RefObject<HTMLVideoElement | null>,
  rootMargin: string = DEFAULT_ROOT_MARGIN
) {
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    if (isNear) return;
    const el = container.current;
    if (!el) return;

    let cancelled = false;
    let observer: IntersectionObserver | null = null;
    let fallbackId: ReturnType<typeof setTimeout> | undefined;

    waitForStartupGate().then(() => {
      if (cancelled) return;

      if (typeof IntersectionObserver === "undefined") {
        // Deferred, never called synchronously in the effect body — see
        // [[eslint_react_compiler_immutability]] for why a bare setState
        // call here trips this project's React Compiler lint rule.
        fallbackId = setTimeout(() => setIsNear(true), 0);
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) setIsNear(true);
        },
        { rootMargin }
      );
      observer.observe(el);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (fallbackId) clearTimeout(fallbackId);
    };
  }, [container, isNear, rootMargin]);

  // `<source>` children only exist in the DOM once `isNear` flips (see each
  // call site's JSX). Inserting a `<source>` into a media element whose
  // networkState is still NETWORK_EMPTY starts resource selection on its
  // own (HTML spec, mandatory) — calling `load()` unconditionally on top of
  // that aborted the request the browser had just started and opened a new
  // one (one ERR_ABORTED + duplicate request per video in the Faz 1 trace).
  // `load()` stays only as the fallback for an engine that didn't start.
  useEffect(() => {
    if (!isNear) return;
    const videoEl = video.current;
    if (videoEl && videoEl.networkState === HTMLMediaElement.NETWORK_EMPTY) videoEl.load();
  }, [isNear, video]);

  // Breakpoint crossed after the source was selected (Q6-3); the desktop
  // copies' sources are all `media="(min-width: 768px)"`.
  useReloadWhenSourceMatches(video, DESKTOP_SOURCE_MEDIA);

  // Note on "stop when off-screen": these desktop videos are never played —
  // they're paused scrub targets (`currentTime` only), so there's no
  // playback to stop when a section leaves the viewport; they cost no
  // decode work while their section isn't being scrolled.

  return isNear;
}

// ---------------------------------------------------------------------
// Scrub resync on late load + paint guard (QC2 O2, QC2 K1, QC3 Q3-1)
// ---------------------------------------------------------------------
// 1) Late load: a desktop scrub hook only seeks inside its ScrollTrigger's
//    onUpdate and skips while `duration` is NaN. With a lazily attached
//    source, a direct jump fires onUpdate once before metadata exists and
//    never again until the next scroll — the video sat on frame 0. On
//    `loadedmetadata` / `loadeddata` we seek straight to wherever the
//    trigger currently says the video should be.
//
// 2) Paint guard: measured in headless Chromium (QC2 K1 on the VP9-alpha
//    S10 clip, QC3 Q3-1 on S12's ss1.mp4): after a *jump* seek — the first
//    seek after the source loads, the first after the video becomes
//    visible, or any seek that moves more than JUMP_SECONDS — `currentTime`
//    and readyState report the right frame but the compositor keeps
//    showing an older one until a new seek happens. So after such a seek
//    settles, re-seek once to the very same time (unconditionally — this
//    is what repaired it in every QC run), then verify with
//    `requestVideoFrameCallback`; if no frame is presented within
//    PAINT_VERIFY_MS, re-seek one more time. Ordinary small scrub steps
//    are never touched, and the re-seeks target the identical position,
//    so nothing visible changes except the stale frame being replaced.
const PAINT_VERIFY_MS = 180;
const JUMP_SECONDS = 0.25;
const SAME_TIME_EPSILON = 0.001;

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export function syncScrubOnLoad(videoEl: HTMLVideoElement, getTargetTime: () => number | null) {
  const el = videoEl as FrameCallbackVideo;
  let lastSettled = el.currentTime;
  // "Fresh": the next seek is the first since load / since becoming visible.
  let fresh = true;
  let guardWanted = false;
  // Guard state: the time being repaired and how many re-seeks are left.
  let guardTime: number | null = null;
  let guardSeeksLeft = 0;
  let verifyTimeout: ReturnType<typeof setTimeout> | undefined;
  let frameHandle: number | undefined;
  let disposed = false;

  const cancelVerify = () => {
    if (verifyTimeout) clearTimeout(verifyTimeout);
    if (frameHandle !== undefined) el.cancelVideoFrameCallback?.(frameHandle);
    verifyTimeout = undefined;
    frameHandle = undefined;
  };

  const endGuard = () => {
    cancelVerify();
    guardTime = null;
    guardSeeksLeft = 0;
  };

  const reseek = (time: number) => {
    guardSeeksLeft -= 1;
    el.currentTime = time;
  };

  const onSeeking = () => {
    if (guardTime !== null) {
      // A real scrub seek elsewhere supersedes the repair in progress.
      if (Math.abs(el.currentTime - guardTime) > SAME_TIME_EPSILON) endGuard();
      return;
    }
    if (fresh || Math.abs(el.currentTime - lastSettled) > JUMP_SECONDS) guardWanted = true;
    fresh = false;
  };

  const onSeeked = () => {
    if (disposed) return;
    lastSettled = el.currentTime;
    if (el.seeking) return;

    if (guardTime !== null) {
      // A guard re-seek settled: verify that a frame actually got presented.
      cancelVerify();
      const time = guardTime;
      if (typeof el.requestVideoFrameCallback !== "function") return endGuard();
      let presented = false;
      frameHandle = el.requestVideoFrameCallback(() => {
        presented = true;
        endGuard();
      });
      verifyTimeout = setTimeout(() => {
        if (presented || guardTime !== time) return;
        if (guardSeeksLeft > 0) reseek(time);
        else endGuard();
      }, PAINT_VERIFY_MS);
      return;
    }

    if (guardWanted) {
      guardWanted = false;
      guardTime = el.currentTime;
      guardSeeksLeft = 2; // the unconditional one + at most one more
      reseek(guardTime);
    }
  };

  const resync = () => {
    fresh = true;
    const target = getTargetTime();
    if (target == null || Number.isNaN(target)) return;
    // Seek even when already at the target, so the guard runs once on load.
    el.currentTime = target;
  };

  let observer: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== "undefined") {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) fresh = true;
    });
    observer.observe(el);
  }

  el.addEventListener("seeking", onSeeking);
  el.addEventListener("seeked", onSeeked);
  el.addEventListener("loadedmetadata", resync);
  // Source may already be loaded by the time the hook runs (cache, eager hero).
  const initialId = el.readyState >= 1 ? setTimeout(resync, 0) : undefined;

  return () => {
    disposed = true;
    if (initialId) clearTimeout(initialId);
    observer?.disconnect();
    el.removeEventListener("seeking", onSeeking);
    el.removeEventListener("seeked", onSeeked);
    el.removeEventListener("loadedmetadata", resync);
    endGuard();
  };
}

// progress (0–1) → video time, or null while metadata isn't there yet.
export function scrubTargetTime(videoEl: HTMLVideoElement, progress: number | undefined) {
  const duration = videoEl.duration;
  if (!duration || Number.isNaN(duration) || progress == null) return null;
  return progress * duration;
}
