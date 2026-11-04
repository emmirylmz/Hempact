"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { gsap, ScrollTrigger, eases } from "@/lib/gsapConfig";

type Refs = {
  container: RefObject<HTMLElement | null>;
  image: RefObject<HTMLDivElement | null>;
  heading: RefObject<HTMLHeadingElement | null>;
  subheading: RefObject<HTMLParagraphElement | null>;
  scrollCue: RefObject<HTMLDivElement | null>;
};

// Entrance timing — one table shared by the CSS keyframes in
// app/globals.css (`.hero-enter-*`) and the GSAP handoff below; keep both
// in sync. Seconds from first paint.
//   image      0.0 → 1.2   scale 0.95→1 (opacity stays 1) power3.out
//   heading    0.5 → 1.2   y 10→0 (opacity stays 1)      power3.out
//   subheading 0.9 → 1.5   opacity 0→1, y 10→0           power3.out
//   scrollCue  1.4 → 2.0   opacity 0→0.6                 power3.out
//   scrollCue  2.6 → ∞     opacity 0.6↔0.25, 1.6 s yoyo  sine.inOut (CSS only)
const ENTRANCE_END = 2.0;
const BREATH_DELAY = 2.6;

// Marker classes (see globals.css). An element rendered with
// `hero-enter-image` means the entrance is CSS-driven from first paint;
// without it (a caller that hasn't adopted the classes yet) this hook falls
// back to the original GSAP-only entrance, unchanged.
const CSS_IMAGE_CLASS = "hero-enter-image";
const HANDOFF_CLASS = "hero-enter-js";
// Reduced motion: no entrance and no breath at all, content shown as-is.
const STATIC_CLASS = "hero-enter-off";
const CUE_CLASS = "hero-enter-cue";
const CSS_IMAGE_ANIMATION = "hero-image-in";
const CSS_CLOCK_ANIMATION = "hero-cue-breath";
const JS_BREATH_ANIMATION = "hero-cue-breath-js";

type CSSAnimationLike = Animation & { animationName?: string };

function findAnimation(el: Element | null, name: string) {
  return el?.getAnimations?.().find((candidate) => (candidate as CSSAnimationLike).animationName === name);
}

// Seconds the CSS entrance has been running. All four `hero-enter-*`
// animations start in the same style pass (first paint), so any of them is
// the clock — but a *finished* animation holds its currentTime at its own
// end (the image's would stay at 1.2 s forever), so the cue's infinite
// CSS-phase breath (never finishes; its currentTime keeps counting through
// its 2.6 s delay) is read first. `Infinity` when nothing is running — this
// copy is the CSS-hidden desktop/mobile twin, or the browser can't tell us:
// showing the final state is the safe answer, never re-hiding content.
function cssEntranceElapsed(image: HTMLElement, scrollCue: HTMLElement | null): number {
  const clock = findAnimation(scrollCue, CSS_CLOCK_ANIMATION);
  if (clock?.currentTime != null) return Number(clock.currentTime) / 1000;

  const imageAnimation = findAnimation(image, CSS_IMAGE_ANIMATION);
  if (imageAnimation?.currentTime == null || imageAnimation.playState === "finished") {
    return Number.POSITIVE_INFINITY;
  }
  return Number(imageAnimation.currentTime) / 1000;
}

type EntranceEls = {
  image: HTMLDivElement;
  heading: HTMLHeadingElement | null;
  subheading: HTMLParagraphElement | null;
  scrollCue: HTMLDivElement | null;
};

// CSS-driven path (bulgu #8/#9). The entrance starts in CSS at first paint:
// no JS needed, the H1 (this page's LCP element) is never at opacity 0, and
// the reveal no longer waits for hydration. It can't *stay* in CSS though:
// GSAP's pin moves this section into its pin-spacer on creation and on
// every refresh (DOM remove + insert, see ScrollTrigger's _swapPinIn/Out),
// and a DOM move restarts CSS animations — the reveal would replay. So at
// hydration (this layout effect runs before the section's own pin is
// created) the remaining part of the very same timeline continues in GSAP
// from the exact elapsed time; inline styles survive DOM moves. Only the
// endless breath stays in CSS (compositor; no GSAP ticker kept awake
// forever — #9), re-synced after each refresh so a restart never shifts
// its phase.
function handOffCssEntrance(
  { image, heading, subheading, scrollCue }: EntranceEls,
  onEntranceComplete?: () => void
) {
  const elapsed = cssEntranceElapsed(image, scrollCue);

  const tl = gsap.timeline({ paused: true, defaults: { ease: eases.fabric } });
  tl.fromTo(image, { scale: 0.95 }, { scale: 1, duration: 1.2 }, 0);
  if (heading) tl.fromTo(heading, { y: 10 }, { y: 0, duration: 0.7 }, 0.5);
  if (subheading) tl.fromTo(subheading, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 0.9);
  if (scrollCue) tl.fromTo(scrollCue, { opacity: 0 }, { opacity: 0.6, duration: 0.6 }, 1.4);

  // Same synchronous block as the GSAP seek below, so the browser never
  // paints a frame between "CSS stopped" and "GSAP applied". The class is
  // deliberately never removed again (not even on cleanup): putting the CSS
  // entrance back would replay it.
  [image, heading, subheading, scrollCue].forEach((el) => el?.classList.add(HANDOFF_CLASS));
  const stopBreath = scrollCue
    ? startCssBreath(scrollCue, Number.isFinite(elapsed) ? BREATH_DELAY - elapsed : 0)
    : undefined;

  if (elapsed >= ENTRANCE_END) {
    tl.progress(1);
    // Optional caller hook (Section01 no longer uses it to gate its video —
    // QC2 K2). Deferred, never synchronous (see
    // [[eslint_react_compiler_immutability]]).
    if (onEntranceComplete) setTimeout(onEntranceComplete, 0);
  } else {
    if (onEntranceComplete) tl.call(onEntranceComplete);
    tl.time(Math.max(0, elapsed)).play();
  }

  return stopBreath;
}

// The endless scroll-cue "breath" (0.6 ↔ 0.25, 1.6 s each way, sine.inOut)
// as a CSS animation instead of a GSAP `repeat: -1` tween — an infinite
// tween keeps GSAP's ticker (a rAF loop) awake forever, even while idle and
// even for the CSS-hidden twin copy (QC2 K7). `delay` is seconds from now,
// exactly like the old tween's `delay` (may be negative to resume
// mid-phase). A pin swap (DOM move) re-creates the animation "now"; after
// every ScrollTrigger refresh its start is pinned back to this moment so
// the phase never jumps.
function startCssBreath(cue: HTMLElement, delay: number) {
  const startTime = Number(document.timeline?.currentTime ?? 0);
  cue.style.setProperty("--hero-breath-delay", `${delay}s`);
  cue.classList.add(CUE_CLASS, HANDOFF_CLASS);

  const resyncBreath = () => {
    const breath = findAnimation(cue, JS_BREATH_ANIMATION);
    if (breath && startTime) breath.startTime = startTime;
  };
  ScrollTrigger.addEventListener("refresh", resyncBreath);
  return () => ScrollTrigger.removeEventListener("refresh", resyncBreath);
}

// How a copy runs its entrance:
// - "handoff": CSS from first paint, the remainder handed to GSAP at
//   hydration (the desktop section: its GSAP pin moves it in the DOM).
// - "css": CSS only, nothing at hydration. For a copy that is never moved
//   in the DOM: MobileScene01 (MobileStage pins with its own server-rendered
//   pin-spacer, QC4 Q4-1), so a CSS animation is never restarted. The
//   handoff cost 60-130 ms at 4x CPU inside the hydration commit
//   (getAnimations() forces a style recalc, the timeline parses transforms)
//   for a visually identical result: the CSS curves are GSAP's own.
// - "off": the copy is CSS-hidden at this width (display:none); nothing to
//   animate. Re-runs as "handoff" if the width changes.
export type HeroEntranceMode = "handoff" | "css" | "off";

export function useSection01Timeline(
  { container, image, heading, subheading, scrollCue }: Refs,
  reducedMotion: boolean,
  onEntranceComplete?: () => void,
  mode: HeroEntranceMode = "handoff"
) {
  useGSAP(
    () => {
      if (mode !== "handoff") {
        // The same one-line container reset the other paths do first.
        // `backgroundColor` is not a transform: GSAP writes it without
        // parsing a computed style.
        gsap.set(container.current, { backgroundColor: "transparent" });
        return;
      }
      const imageEl = image.current;
      const headingEl = heading.current;
      const subheadingEl = subheading.current;
      const cueEl = scrollCue.current;
      const cssDriven = Boolean(imageEl?.classList.contains(CSS_IMAGE_CLASS));

      if (reducedMotion) {
        if (cssDriven) {
          [imageEl, headingEl, subheadingEl, cueEl].forEach((el) => el?.classList.add(STATIC_CLASS));
        }
        // Deferred, never called synchronously here — see
        // [[eslint_react_compiler_immutability]]; same reasoning as every
        // other bare setState-adjacent call in this codebase's effects.
        if (onEntranceComplete) setTimeout(onEntranceComplete, 0);
        return;
      }

      gsap.set(container.current, { backgroundColor: "transparent" });

      if (cssDriven && imageEl) {
        return handOffCssEntrance({ image: imageEl, heading: headingEl, subheading: subheadingEl, scrollCue: cueEl }, onEntranceComplete);
      }

      // ---- Legacy path (caller without the CSS classes): same entrance
      // in GSAP as before; only the endless breath moved to CSS (K7). ----
      gsap.set(imageEl, { opacity: 0, scale: 0.95 });
      gsap.set(headingEl, { opacity: 0, y: 10 });
      gsap.set(subheadingEl, { opacity: 0, y: 10 });
      gsap.set(cueEl, { opacity: 0 });

      // ~2s total, unhurried: image resolves into focus first, then the
      // headline, then the supporting line and cue. (No animated
      // `filter: blur()` and no per-word stagger — both were removed
      // earlier for per-frame raster cost; see git history.)
      const legacy = gsap.timeline({ defaults: { ease: eases.fabric } });
      legacy
        .to(imageEl, { opacity: 1, scale: 1, duration: 1.2 })
        .to(headingEl, { opacity: 1, y: 0, duration: 0.7 }, 0.5)
        .to(subheadingEl, { opacity: 1, y: 0, duration: 0.6 }, "-=0.3")
        .to(cueEl, { opacity: 0.6, duration: 0.6 }, "-=0.1");
      if (onEntranceComplete) legacy.call(onEntranceComplete);
      // Was `gsap.to(cueEl, { opacity: 0.25, duration: 1.6, ease: breath,
      // yoyo: true, repeat: -1, delay: 2.6 })` — same values, in CSS.
      if (cueEl) return startCssBreath(cueEl, BREATH_DELAY);
    },
    { scope: container, dependencies: [reducedMotion, mode] }
  );
}
