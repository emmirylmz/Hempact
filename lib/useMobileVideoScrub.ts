"use client";

import { gsap, ScrollTrigger } from "@/lib/gsapConfig";

// Mobile now matches desktop's own pin+scrub pattern exactly instead of a
// weaker unpinned "scrub as it drifts past" fallback — pinning was
// originally dropped for mobile entirely (iOS's dynamic address bar
// resizing the viewport mid-scroll fought GSAP's pin math badly), but that
// root cause is what the sitewide `dvh` conversion plus
// `ScrollTrigger.config({ ignoreMobileResize: true })` (see
// [[mobile_scroll_architecture]]) already fixed — so the reason for
// avoiding pin no longer applies, and dropping it was itself what made the
// video feel disconnected from scroll (the section scrolls away under its
// own steam regardless of how much of the footage has played). Pinning
// holds the section in place for an artificial scroll runway (via GSAP's
// own pin-spacer, `end: "+=X%"`) exactly like desktop, so the page
// genuinely can't advance past a section until its video finishes. Touch-
// scroll and wheel-scroll both just move `window.scrollY`, so nothing here
// is touch-specific: ScrollTrigger's own scroll listener already reads
// whichever one produced the movement.
// Extracted so MobileStage.tsx's per-run scenes (which drive video scrub
// via the stage's own single pin instead of calling scrubVideoOnMobile
// below) can still prime each video the same way: iOS Safari (and some
// other WebKit builds) can silently accept a bare `currentTime` assignment
// on a video that's never actually been played, without ever painting the
// new frame — the internal position updates but nothing renders. A real
// play() that resolves, immediately followed by pause(), forces the
// decode pipeline to actually start once, so every later scrub paints
// correctly. Fire-and-forget: call once per video on mount, don't gate
// anything else on it.
export function primeMobileVideo(videoEl: HTMLVideoElement) {
  videoEl.muted = true;
  const primed = videoEl.play();
  if (primed && typeof primed.then === "function") {
    primed.then(() => videoEl.pause()).catch(() => {});
  }
}

// Every MobileSceneNN.tsx's onProgressRef handler was assigning
// `videoEl.currentTime = progress * duration` unconditionally on every
// single scroll tick — including ticks where the computed target is
// (near enough) the same frame already showing. A `currentTime` write is
// never free: it's a real seek into the decode pipeline, and
// MobileStage.tsx fans every tick out to *all* scenes in a run (not just
// the currently-active one, see its own comment), so before this fix a
// single scroll frame during Run A could trigger up to 7 redundant seeks
// on videos that were fully off-window and not visibly changing at all —
// a real, confirmed contributor to the "videos feel like they're
// stuttering" report on real phones (see
// [[mobile_unified_stage_architecture]]). Ported from the epsilon guard
// desktop's own scrub timelines (e.g. useSection02Timeline.ts) and this
// file's own `scrubVideoOnMobile` already used — just centralized so
// every MobileSceneNN.tsx (and useChromaKeyVideo.ts's own, costlier,
// canvas redraw) can skip the write/redraw entirely below one frame's
// worth of change.
const SCRUB_FRAME_EPSILON = 1 / 30;

export function scrubVideoToProgress(videoEl: HTMLVideoElement, progress: number): boolean {
  const duration = videoEl.duration;
  if (!duration || Number.isNaN(duration)) return false;
  const target = progress * duration;
  if (Math.abs(videoEl.currentTime - target) > SCRUB_FRAME_EPSILON) {
    videoEl.currentTime = target;
    return true;
  }
  return false;
}

export function scrubVideoOnMobile(
  sectionEl: Element | null,
  videoEl: HTMLVideoElement,
  // Every call site now passes its own `end`, copied from that same
  // section's desktop ScrollTrigger — each was already tuned per clip
  // (quieter/longer footage gets more scroll room; see e.g. Section02's own
  // comment). The "+=150%" fallback here only matters if a future section
  // forgets to pass one. `start` stays "top top" everywhere, matching every
  // desktop hook's own start — including Section01, where "top top" is
  // already correct at page load (nothing above to enter from) rather than
  // needing a special case.
  bounds: { start?: string; end?: string } = {}
) {
  videoEl.muted = true;
  // Forced regardless of any prior state — `isMobile`'s first render
  // always assumes desktop (see useIsMobile's server snapshot), so on a
  // real phone this effect can genuinely run once for the desktop branch
  // (which sets the video to opacity 0 pending its own reveal timeline)
  // before isMobile corrects itself client-side and this mobile branch
  // takes over instead; without this line the video stayed invisible
  // forever, still sitting at that leftover opacity 0 (see
  // [[mobile_video_playback_fixes]]).
  gsap.set(videoEl, { opacity: 1 });

  // Priming: iOS Safari (and some other WebKit builds) can silently accept
  // a bare `currentTime` assignment on a video that's never actually been
  // played, without ever painting the new frame — the internal position
  // updates but nothing renders, which looks identical to the video just
  // not being there. A real play() that resolves, immediately followed by
  // pause(), forces the decode pipeline to actually start once, so every
  // later scrub paints correctly. Fire-and-forget: this must NOT gate pin
  // creation below (see why underneath).
  const primed = videoEl.play();
  if (primed && typeof primed.then === "function") {
    primed.then(() => videoEl.pause()).catch(() => {});
  }

  // Native seek precision is plenty here (unlike the desktop pinned scrubs,
  // which chase sub-frame scroll deltas), so a looser epsilon is fine.
  const FRAME_EPSILON = 1 / 24;

  // Built unconditionally, synchronously — never gated behind the video's
  // own metadata loading or the priming play() above. The pin itself (and
  // the pin-spacer it inserts into the document, which is what every
  // section *below* this one measures its own scroll position against)
  // must exist immediately; across 9 sections each loading video metadata
  // at its own unpredictable network-dependent pace, gating pin creation
  // behind that meant pins across the page were created in a staggered,
  // effectively random order — so whichever pins hadn't been created yet
  // at a given moment were invisible to every other section's own already-
  // computed start/end math, producing exactly the "jumpy, non-uniform
  // transition between sections" symptom this replaced. Desktop's own
  // hooks already learned this lesson (see e.g. Section02/03/04/07/10's own
  // "built unconditionally" comments) — only the currentTime scrub itself
  // needs to wait for duration, guarded inline in onUpdate below.
  const scrollTrigger = ScrollTrigger.create({
    trigger: sectionEl,
    start: bounds.start ?? "top top",
    end: bounds.end ?? "+=150%",
    pin: true,
    pinSpacing: true,
    scrub: 0.3,
    onUpdate: (self) => {
      const duration = videoEl.duration;
      if (!duration || Number.isNaN(duration)) return;
      const target = self.progress * duration;
      if (Math.abs(videoEl.currentTime - target) > FRAME_EPSILON) {
        videoEl.currentTime = target;
      }
    },
  });

  return () => {
    scrollTrigger.kill();
  };
}
