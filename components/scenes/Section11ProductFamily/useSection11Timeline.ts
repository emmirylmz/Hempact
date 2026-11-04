"use client";

import type { RefObject } from "react";
import { gsap, eases } from "@/lib/gsapConfig";
import { useIdleGsap } from "@/lib/idleGsap";

// `enabled` is false on mobile widths. There this reveal never played where
// the reader could see it: its trigger was created before the mobile run
// pins above it and measured without their scroll length (refresh ran in
// creation order), so it fired thousands of px early and the reader always
// arrived to the finished state. With refresh now in document order
// (MobileStage `refreshPriority`) it would start playing on arrival; to keep
// the mobile story exactly as shipped, mobile keeps the finished (server-
// rendered) state. Pass true to get the reveal on mobile too (design call).
export function useSection11Timeline(
  container: RefObject<HTMLElement | null>,
  cards: RefObject<(HTMLDivElement | null)[]>,
  reducedMotion: boolean,
  enabled: boolean = true
) {
  // Idle-deferred (lib/idleGsap.ts): this reveal sits far below the first
  // screen, so its setup stays out of the hydration commit.
  useIdleGsap(
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
    container,
    [reducedMotion],
    { enabled }
  );
}
