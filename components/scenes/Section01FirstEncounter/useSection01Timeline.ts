"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { gsap, eases } from "@/lib/gsapConfig";

type Refs = {
  container: RefObject<HTMLElement | null>;
  image: RefObject<HTMLDivElement | null>;
  heading: RefObject<HTMLHeadingElement | null>;
  subheading: RefObject<HTMLParagraphElement | null>;
  scrollCue: RefObject<HTMLDivElement | null>;
};

export function useSection01Timeline(
  { container, image, heading, subheading, scrollCue }: Refs,
  reducedMotion: boolean,
  onEntranceComplete?: () => void
) {
  useGSAP(
    () => {
      if (reducedMotion) {
        // Deferred, never called synchronously here — see
        // [[eslint_react_compiler_immutability]]; same reasoning as every
        // other bare setState-adjacent call in this codebase's effects.
        if (onEntranceComplete) setTimeout(onEntranceComplete, 0);
        return;
      }

      gsap.set(container.current, { backgroundColor: "transparent" });
      gsap.set(image.current, { opacity: 0, scale: 0.95 });
      gsap.set(heading.current, { opacity: 0, y: 10 });
      gsap.set(subheading.current, { opacity: 0, y: 10 });
      gsap.set(scrollCue.current, { opacity: 0 });

      // ~2s total, unhurried: image resolves into focus first, then the
      // headline, then the supporting line and cue.
      //
      // No animated `filter: blur()` here (there used to be one, 20px→0px
      // on the image alongside its opacity/scale) — animating `filter`
      // forces the browser to re-rasterize that box every frame, and it
      // wraps the hero `<video>`, mid-decode/download during this exact
      // window. That per-frame raster cost isn't visible as a JS "long
      // task" (it's compositor/GPU work, not main-thread script), but it
      // was real: it stole frame budget from this same timeline.
      //
      // The heading also used to animate word-by-word (each word its own
      // `inline-block` span, staggered) instead of as one unit — four
      // separately-transforming+fading text nodes is real extra
      // compositor/text-raster work for zero benefit once the blur (the
      // actual expensive neighbor) was already gone, and animating `y` on
      // text specifically forces per-frame glyph re-rasterization at
      // shifting sub-pixel offsets, which is more visible/jarring on a
      // serif display face (Fraunces) than it would be on a plain sans.
      // One `opacity`+`y` tween on the whole `<h1>` reads just as
      // "arriving," at a fraction of the paint cost.
      const tl = gsap.timeline({ defaults: { ease: eases.fabric } });

      tl.to(image.current, { opacity: 1, scale: 1, duration: 1.2 })
        .to(heading.current, { opacity: 1, y: 0, duration: 0.7 }, 0.5)
        .to(subheading.current, { opacity: 1, y: 0, duration: 0.6 }, "-=0.3")
        .to(scrollCue.current, { opacity: 0.6, duration: 0.6 }, "-=0.1");

      // The hero video's own `<source>` doesn't mount until this fires (see
      // Section01FirstEncounter.tsx) — its very first frame decode/paint is
      // a real, one-time hit (initializing a hardware decoder context is
      // not free) that would otherwise land somewhere in the middle of this
      // same timeline, competing for the exact frame budget the word
      // stagger needs. Nothing about the video is needed until the reader
      // actually scrolls, so there's no cost to waiting until this reveal
      // has fully settled first.
      if (onEntranceComplete) tl.call(onEntranceComplete);

      if (scrollCue.current) {
        gsap.to(scrollCue.current, {
          opacity: 0.25,
          duration: 1.6,
          ease: eases.breath,
          yoyo: true,
          repeat: -1,
          delay: 2.6,
        });
      }
    },
    { scope: container, dependencies: [reducedMotion] }
  );
}
