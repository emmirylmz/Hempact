"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { gsap, eases } from "@/lib/gsapConfig";

export function useSection11Timeline(
  container: RefObject<HTMLElement | null>,
  cards: RefObject<(HTMLDivElement | null)[]>,
  reducedMotion: boolean
) {
  useGSAP(
    () => {
      if (reducedMotion) return;
      const cardEls = (cards.current ?? []).filter((el): el is HTMLDivElement => Boolean(el));
      if (cardEls.length === 0) return;

      const fromX = [-60, 0, 60];
      cardEls.forEach((el, i) => {
        gsap.set(el, { opacity: 0, x: fromX[i] ?? 0, y: 24 });
        gsap.to(el, {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.9,
          ease: eases.fabric,
          delay: i * 0.12,
          scrollTrigger: { trigger: container.current, start: "top 70%", toggleActions: "play none none reverse" },
        });
      });
    },
    { scope: container, dependencies: [reducedMotion] }
  );
}
