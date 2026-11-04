"use client";

import { useReloadWhenSourceMatches } from "@/lib/videoSourceMatch";
import { useCallback, useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { ScrollTrigger } from "@/lib/gsapConfig";
import { primeMobileVideo } from "@/lib/useMobileVideoScrub";
import manifest from "@/public/images/v2/manifest.json";

// ---------------------------------------------------------------------------
// Mobile video loading scheduler (Faz 2 / P2, bulgu #1 + #3 + #4).
//
// Before this, every MobileSceneNN.tsx rendered its `<source>` with
// `preload="auto"` unconditionally, so a phone opening the page downloaded
// all 9 mobile videos at once (~32 MB, 6-7 concurrent fetches for ~30 s on
// 4G — the hero video alone took 12.5 s instead of ~2 s) and hydration
// primed all 9 with play()/pause() in the same 20 ms (9 decoder inits,
// 1.1 s frame freeze at 4x CPU). See docs/scroll-performans-raporu.md 1.1-1.2.
//
// Now each scene's video moves through four levels, decided centrally from
// *where the reader actually is* in the global 01..12 scene order:
//
//   OFF    no <source>, no poster          (|d| >= 3, decoder released)
//   POSTER poster only                     (|d| == 2 and never attached)
//   WARM   <source>, preload="metadata"    (d == -1, or |d| == 2 if it was
//                                           already attached — kept, paused)
//   HOT    <source>, preload="auto"        (d == 0 active, d == +1 next)
//
// where d = sceneIndex - activeSceneIndex. S01 starts HOT in the server
// HTML itself (its <source> is parsed with the page — "S01 hemen"); every
// other scene starts OFF. Neighbours only rise after the "gate" opens:
// window `load` (media elements delay `load` until their first frame, so
// this naturally waits for the hero) + one idle callback, or the reader's
// first touch/wheel, whichever comes first ("S02 yükten + boşta sonra").
// The active scene itself is never gated: a mid-page reload, back-button
// scroll restoration or a menu jump requests the target scene's video as
// soon as its position is known.
//
// Only the *loading* changes here. Which frame is shown for a given scroll
// position is still decided exactly as before by each scene's own
// onLocalProgress handler (MobileStage.tsx).
// ---------------------------------------------------------------------------

/** Same query every mobile <source> uses (exact complement of desktop's (min-width: 768px)). */
export const MOBILE_SOURCE_MEDIA = "(max-width: 767.98px)";

type ManifestEntry = (typeof manifest)[keyof typeof manifest];
export type MobileVideoName = keyof typeof manifest;

// Which video each mobile scene scrubs. Scenes 08, 09 and 11 have none.
const SCENE_VIDEO = {
  "01": "hero-plant-growth",
  "02": "section2",
  "03": "section3",
  "04": "section4",
  "05": "ped1.1",
  "06": "liquid-drop",
  "07": "skin-contact-weave",
  "10": "kadinsSon-fallback",
  "12": "ss1",
} as const satisfies Record<string, MobileVideoName>;

export type MobileVideoSceneId = keyof typeof SCENE_VIDEO;

export function mobileSceneVideo(sceneId: MobileVideoSceneId): ManifestEntry {
  return manifest[SCENE_VIDEO[sceneId]];
}

const LEVEL_OFF = 0;
const LEVEL_POSTER = 1;
const LEVEL_WARM = 2;
const LEVEL_HOT = 3;
type Level = 0 | 1 | 2 | 3;

const sceneIndex = (id: string) => parseInt(id, 10) - 1;
const initialLevel = (id: string): Level => (id === "01" ? LEVEL_HOT : LEVEL_OFF);

// --- store -----------------------------------------------------------------

const levels = new Map<string, Level>();
const listeners = new Map<string, Set<() => void>>();
const videos = new Map<string, HTMLVideoElement>();
const primed = new Set<string>();

const getLevel = (id: string): Level => levels.get(id) ?? initialLevel(id);

function setLevel(id: string, level: Level) {
  if (getLevel(id) === level) return;
  levels.set(id, level);
  listeners.get(id)?.forEach((notify) => notify());
}

function subscribeLevel(id: string, notify: () => void) {
  let set = listeners.get(id);
  if (!set) {
    set = new Set();
    listeners.set(id, set);
  }
  set.add(notify);
  return () => {
    set.delete(notify);
  };
}

// --- active scene from scroll position ---------------------------------------

type Run = {
  trigger: ScrollTrigger;
  sceneIds: string[];
  windows: { start: number; end: number }[];
};

const runs: Run[] = [];
let activeIndex: number | null = null;
let gateOpen = false;
let installed = false;
let applyTimer: ReturnType<typeof setTimeout> | undefined;

// Raw scroll position against each run's own pinned range — deliberately
// not the stage's scrubbed (smoothed) progress: after a jump that smoothing
// would sweep through every intermediate scene and request all of their
// videos on the way. Gaps between runs are the unpinned scenes (08, 11).
function computeActiveIndex(): number | null {
  if (!runs.length) return null;
  const y = window.scrollY;
  for (let r = 0; r < runs.length; r++) {
    const run = runs[r];
    const start = run.trigger.start;
    const end = run.trigger.end;
    if (!(end > start)) return null; // not measured yet
    if (y < start) return r === 0 ? sceneIndex(run.sceneIds[0]) : sceneIndex(run.sceneIds[0]) - 1;
    if (y <= end) {
      const p = (y - start) / (end - start);
      for (let i = 0; i < run.windows.length; i++) {
        if (p < run.windows[i].end) return sceneIndex(run.sceneIds[i]);
      }
      return sceneIndex(run.sceneIds[run.sceneIds.length - 1]);
    }
  }
  const last = runs[runs.length - 1];
  return sceneIndex(last.sceneIds[last.sceneIds.length - 1]);
}

function targetLevel(index: number, active: number, current: Level): Level {
  const d = index - active;
  const dist = Math.abs(d);
  if (d === 0) return LEVEL_HOT;
  if (dist >= 3) return LEVEL_OFF;
  if (!gateOpen) return current;
  if (d === 1) return LEVEL_HOT;
  if (d === -1) return LEVEL_WARM;
  return current >= LEVEL_WARM ? LEVEL_WARM : LEVEL_POSTER;
}

function apply() {
  const active = computeActiveIndex();
  if (active === null) return;
  activeIndex = active;
  (Object.keys(SCENE_VIDEO) as MobileVideoSceneId[]).forEach((id) => {
    const d = sceneIndex(id) - active;
    // Left the active/next pair: make sure nothing is left playing (only a
    // priming play() could be — scrubbing itself never plays).
    if (d !== 0 && d !== 1) {
      const el = videos.get(id);
      if (el && !el.paused) el.pause();
    }
    setLevel(id, targetLevel(sceneIndex(id), active, getLevel(id)));
  });
  queuePrimes(active);
}

// Short trailing debounce on scroll-driven changes: a fast fling or a smooth
// menu jump passes through several scenes in a few hundred ms; only where
// it settles should start downloads. Normal scrolling loses nothing — the
// next scene was already HOT before the reader reached it.
const SETTLE_MS = 120;

function onScroll() {
  const index = computeActiveIndex();
  if (index === null || index === activeIndex) return;
  activeIndex = index;
  clearTimeout(applyTimer);
  applyTimer = setTimeout(apply, SETTLE_MS);
}

function applyNow() {
  clearTimeout(applyTimer);
  apply();
}

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

export function whenIdle(cb: () => void, timeout: number) {
  const w = window as IdleWindow;
  // iOS Safari has no requestIdleCallback.
  if (w.requestIdleCallback) w.requestIdleCallback(cb, { timeout });
  else setTimeout(cb, 50);
}

function openGate() {
  if (gateOpen) return;
  gateOpen = true;
  applyNow();
}

function install() {
  if (installed) return;
  installed = true;
  window.addEventListener("scroll", onScroll, { passive: true });
  ScrollTrigger.addEventListener("refresh", applyNow);

  const afterLoad = () => whenIdle(openGate, 2000);
  if (document.readyState === "complete") afterLoad();
  else window.addEventListener("load", afterLoad, { once: true });
  // The reader starting to move is as good a signal as `load`.
  window.addEventListener("touchstart", openGate, { once: true, passive: true });
  window.addEventListener("wheel", openGate, { once: true, passive: true });
}

/**
 * Called by MobileStage.tsx right after it creates its pinned trigger.
 * No-op outside the mobile source breakpoint (e.g. a touch tablet ≥768 px,
 * where the stage still runs but no mobile <source> would match anyway).
 */
export function registerMobileRun(run: Run): () => void {
  if (typeof window === "undefined" || !window.matchMedia(MOBILE_SOURCE_MEDIA).matches) return () => {};
  install();
  runs.push(run);
  runs.sort((a, b) => sceneIndex(a.sceneIds[0]) - sceneIndex(b.sceneIds[0]));
  // One frame later, so all three runs (created in the same commit) are in.
  const raf = requestAnimationFrame(applyNow);
  return () => {
    cancelAnimationFrame(raf);
    const i = runs.indexOf(run);
    if (i >= 0) runs.splice(i, 1);
  };
}

// --- priming (iOS) -----------------------------------------------------------
// iOS Safari can accept `currentTime` writes on a never-played video without
// ever painting the frame (see primeMobileVideo's own comment). The prime is
// kept, but only for the active scene and the next one, one video at a
// time, after the gate — instead of all 9 at hydration.

let primeQueue: string[] = [];
let priming = false;
let gestureRetryArmed = false;

function queuePrimes(active: number) {
  if (!gateOpen) return;
  primeQueue = (Object.keys(SCENE_VIDEO) as MobileVideoSceneId[])
    .filter((id) => {
      const d = sceneIndex(id) - active;
      return (d === 0 || d === 1) && getLevel(id) >= LEVEL_WARM && !primed.has(id);
    })
    .sort((a, b) => Math.abs(sceneIndex(a) - active) - Math.abs(sceneIndex(b) - active));
  pumpPrimes();
}

function pumpPrimes() {
  if (priming || !primeQueue.length) return;
  priming = true;
  whenIdle(primeNext, 300);
}

function primeNext() {
  const id = primeQueue.shift();
  const el = id ? videos.get(id) : undefined;
  if (!id || !el || primed.has(id) || getLevel(id) < LEVEL_WARM) {
    priming = false;
    pumpPrimes();
    return;
  }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    priming = false;
    pumpPrimes();
  };
  // A video whose data hasn't arrived yet keeps its play() pending; don't
  // hold the queue hostage — it still counts as primed if it resolves later.
  const timer = setTimeout(finish, 4000);
  primeMobileVideo(el).then(
    () => {
      primed.add(id);
      finish();
    },
    (error: unknown) => {
      // Low Power Mode etc.: play() needs a user gesture — retry on the first touch.
      if (error instanceof DOMException && error.name === "NotAllowedError") armGestureRetry(id);
      finish();
    }
  );
}

function armGestureRetry(id: string) {
  if (!primeQueue.includes(id)) primeQueue.push(id);
  if (gestureRetryArmed) return;
  gestureRetryArmed = true;
  const retry = () => {
    gestureRetryArmed = false;
    window.removeEventListener("touchend", retry);
    window.removeEventListener("pointerup", retry);
    pumpPrimes();
  };
  window.addEventListener("touchend", retry, { passive: true });
  window.addEventListener("pointerup", retry, { passive: true });
}

// --- React side ----------------------------------------------------------------

export type MobileSceneMedia = {
  /** Render the scene's <source> only while true. */
  attached: boolean;
  preload: "auto" | "metadata" | "none";
  /** Mobile poster URL while the scene is within ±2 (undefined otherwise). */
  poster: string | undefined;
  src: string;
  width: number;
  height: number;
};

/**
 * Subscribes a mobile scene's <video> to the scheduler. Render:
 *   <video ref preload={m.preload} poster={m.poster}>
 *     {m.attached && <source src={m.src} type="video/mp4" media={MOBILE_SOURCE_MEDIA} />}
 *   </video>
 */
export function useMobileSceneMedia(
  sceneId: MobileVideoSceneId,
  videoRef: RefObject<HTMLVideoElement | null>
): MobileSceneMedia {
  const subscribe = useCallback((notify: () => void) => subscribeLevel(sceneId, notify), [sceneId]);
  const level = useSyncExternalStore(
    subscribe,
    () => getLevel(sceneId),
    () => initialLevel(sceneId)
  );
  const entry = mobileSceneVideo(sceneId);
  const attached = level >= LEVEL_WARM;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    videos.set(sceneId, el);
    return () => {
      if (videos.get(sceneId) === el) videos.delete(sceneId);
    };
  }, [sceneId, videoRef]);

  // Breakpoint crossed after this source was selected (Q6-3).
  useReloadWhenSourceMatches(videoRef, MOBILE_SOURCE_MEDIA);

  const wasAttached = useRef(attached);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (attached) {
      // Inserting a <source> into an empty media element starts resource
      // selection by itself (HTML spec); an extra load() here would abort
      // and re-issue that request. Only kick it if the engine didn't.
      if (el.networkState === HTMLMediaElement.NETWORK_EMPTY) el.load();
    } else if (wasAttached.current) {
      // Released (≥3 scenes away): <source> is gone from the DOM; load()
      // drops the buffered data and frees the hardware decoder.
      el.pause();
      el.load();
      primed.delete(sceneId);
    }
    wasAttached.current = attached;
  }, [attached, sceneId, videoRef]);

  return {
    attached,
    preload: level === LEVEL_HOT ? "auto" : level === LEVEL_WARM ? "metadata" : "none",
    poster: level >= LEVEL_POSTER && !entry.posterMobileAlpha ? entry.posterMobile : undefined,
    src: entry.mobile,
    width: entry.mobileWidth,
    height: entry.mobileHeight,
  };
}

/** True while the scene is within ±2 of the active one (poster may be shown). */
export function useMobileScenePosterVisible(sceneId: MobileVideoSceneId): boolean {
  const subscribe = useCallback((notify: () => void) => subscribeLevel(sceneId, notify), [sceneId]);
  return useSyncExternalStore(
    subscribe,
    () => getLevel(sceneId) >= LEVEL_POSTER,
    () => initialLevel(sceneId) >= LEVEL_POSTER
  );
}

/**
 * Wires a plain (non-canvas) scene's progress handler, remembering the last
 * progress so it can be re-applied once the lazily attached video's
 * metadata arrives — MobileStage only calls a scene again when its progress
 * *changes*, so without this a video attached while its scene sits at
 * progress 1 (reader came back from below) would show frame 0 until the
 * next scroll tick.
 */
export function useMobileScrub(
  videoRef: RefObject<HTMLVideoElement | null>,
  onProgressRef: RefObject<((localProgress: number) => void) | null>,
  handler: (videoEl: HTMLVideoElement, localProgress: number) => void
) {
  const lastProgress = useRef<number | null>(null);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
    onProgressRef.current = (localProgress: number) => {
      lastProgress.current = localProgress;
      const videoEl = videoRef.current;
      if (videoEl) handler(videoEl, localProgress);
    };
  });

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const reapply = () => {
      if (lastProgress.current !== null) handlerRef.current(videoEl, lastProgress.current);
    };
    videoEl.addEventListener("loadedmetadata", reapply);
    return () => videoEl.removeEventListener("loadedmetadata", reapply);
  }, [videoRef]);
}
