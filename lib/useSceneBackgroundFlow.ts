"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import { gsap, ScrollTrigger, eases } from "@/lib/gsapConfig";
import { mixColorsHsl } from "@/lib/colorMix";
import { BACKGROUND_FLOW_ID } from "@/components/scroll/BackgroundFlow";

// Lets each scene "hand off" the shared fixed background layer to its own color
// as it scrolls through view, so the whole page reads as one continuous gradient
// flow rather than hard cuts between flat section backgrounds.
//
// Every section calls this hook independently (same public signature as
// before — no call site anywhere in components/scenes/* needed to change),
// but internally they no longer each drive their own gsap.to({backgroundColor})
// tween against the *same* shared DOM node. Two problems came from that:
//
// 1. "Atlama" (jumping): with 12 independent ScrollTriggers all capable of
//    firing at once, two adjacent sections' trigger ranges can overlap (a
//    tall section's own "bottom center" can fire after the next section's
//    "top center" already has), which means two GSAP tweens were briefly
//    fighting over the same `backgroundColor` property — whichever last
//    wrote wins, and the pattern is not tied only to scroll direction
//    consistently, so it reads as a color glitch/snap instead of a smooth
//    handoff.
// 2. "Çamurlaşma" (muddiness): gsap.to({ backgroundColor }) interpolates in
//    plain RGB by default. RGB interpolation between two different hue
//    families (e.g. paleHemp's green and warmTaupe's brown) drags straight
//    through a flat, desaturated grey in the middle — visually a "muddy"
//    dead zone, not a color one hue sliding into another.
//
// Fix: every instance just registers {element, color, progress} into a
// shared registry; a single authoritative compositor (composite(), below)
// reads the *entire* registry on every scroll update and writes the shared
// layer's background exactly once, computed via HSL interpolation (see
// colorMix.ts) with an eased progress curve. One writer, one color space —
// structurally can't jump or fight itself, and the palette itself (which
// section maps to which color) is completely unchanged from before.
type Entry = {
  el: HTMLElement;
  color: string;
  progress: number;
};

const registry = new Map<symbol, Entry>();
const progressEase = gsap.parseEase(eases.water);
let lastAppliedColor: string | null = null;

function sortedEntries(): Entry[] {
  return Array.from(registry.values()).sort((a, b) => {
    const position = a.el.compareDocumentPosition(b.el);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

function composite() {
  const bgLayer = document.getElementById(BACKGROUND_FLOW_ID);
  if (!bgLayer) return;

  const entries = sortedEntries();
  if (entries.length === 0) return;

  // The furthest-down section whose transition has begun is the one
  // currently "in charge" of the shared layer's color — everything before
  // it in page order has already fully resolved to its own color.
  let activeIndex = -1;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].progress > 0) activeIndex = i;
  }

  let color: string;
  if (activeIndex === -1) {
    color = entries[0].color;
  } else {
    const active = entries[activeIndex];
    const fromColor = activeIndex === 0 ? entries[0].color : entries[activeIndex - 1].color;
    const eased = progressEase(Math.min(1, Math.max(0, active.progress)));
    color = mixColorsHsl(fromColor, active.color, eased);
  }

  if (color === lastAppliedColor) return;
  bgLayer.style.backgroundColor = color;
  lastAppliedColor = color;
}

// Lower-level registry API, factored out so MobileStage.tsx can drive an
// entry's progress imperatively (per scene, from its own single run-level
// ScrollTrigger) instead of each entry owning its own independent trigger.
// Needed once a section's mobile rendering moves inside a MobileStage run:
// every scene there shares the exact same `absolute inset-0` rect, so a
// "top center"/"bottom center" trigger tied to the scene's own element
// would be degenerate (all scenes' rects are identical) — the stage
// computes each scene's own scroll-relative progress itself and just
// needs somewhere to feed it into the shared compositor.
export function createBackgroundFlowEntry(el: HTMLElement, color: string) {
  const key = Symbol();
  registry.set(key, { el, color, progress: 0 });
  composite();

  return {
    setProgress(progress: number) {
      const entry = registry.get(key);
      if (!entry) return;
      entry.progress = progress;
      composite();
    },
    destroy() {
      registry.delete(key);
      composite();
    },
  };
}

// `enabled` (default true): lets a section skip registering entirely once
// its mobile rendering has moved into a MobileStage run — otherwise this
// hook's own independent ScrollTrigger would still fire against the
// section's now-CSS-hidden (`display:none`) desktop copy, which has a
// degenerate zero-sized rect, and its bogus progress would fight the
// stage's own writes to the same shared registry entry-space. Sections
// not part of any stage (Section08/09(desktop-only pin still uses
// this)/11, and every section's own *desktop* rendering) keep passing
// `true` (or omit the argument) exactly as before.
export function useSceneBackgroundFlow(
  sectionRef: RefObject<HTMLElement | null>,
  color: string,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;
    const el = sectionRef.current;
    if (!el) return;

    const entry = createBackgroundFlowEntry(el, color);

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top center",
      end: "bottom center",
      scrub: true,
      onUpdate: (self) => entry.setProgress(self.progress),
    });

    return () => {
      trigger.kill();
      entry.destroy();
    };
  }, [sectionRef, color, enabled]);
}
