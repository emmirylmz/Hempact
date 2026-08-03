"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { gsap, eases } from "@/lib/gsapConfig";

type Refs = {
  container: RefObject<HTMLElement | null>;
  image: RefObject<HTMLDivElement | null>;
  words: RefObject<HTMLSpanElement[]>;
  subheading: RefObject<HTMLParagraphElement | null>;
  scrollCue: RefObject<HTMLDivElement | null>;
};

export function useSection01Timeline(
  { container, image, words, subheading, scrollCue }: Refs,
  reducedMotion: boolean
) {
  useGSAP(
    () => {
      if (reducedMotion) return;

      const wordEls = words.current ?? [];

      gsap.set(container.current, { backgroundColor: "transparent" });
      gsap.set(image.current, { opacity: 0, scale: 0.95, filter: "blur(20px)" });
      gsap.set(wordEls, { opacity: 0, y: 14 });
      gsap.set(subheading.current, { opacity: 0, y: 10 });
      gsap.set(scrollCue.current, { opacity: 0 });

      // ~2.5s total, unhurried: image resolves into focus first, then the
      // headline arrives word by word, then the supporting line and cue.
      const tl = gsap.timeline({ defaults: { ease: eases.fabric } });

      tl.to(image.current, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.4 })
        .to(wordEls, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08 }, 0.9)
        .to(subheading.current, { opacity: 1, y: 0, duration: 0.6 }, "-=0.2")
        .to(scrollCue.current, { opacity: 0.6, duration: 0.6 }, "-=0.1");

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
