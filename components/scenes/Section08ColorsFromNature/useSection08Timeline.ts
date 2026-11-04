"use client";

import type { RefObject } from "react";
import { gsap, eases } from "@/lib/gsapConfig";
import { useIdleGsap } from "@/lib/idleGsap";

type Refs = {
  container: RefObject<HTMLElement | null>;
  columns: RefObject<(HTMLDivElement | null)[]>;
};

// `enabled` is false on mobile widths. There this reveal never played where
// the reader could see it: its trigger was created before the mobile run
// pins above it and measured without their scroll length (refresh ran in
// creation order), so it fired thousands of px early and the reader always
// arrived to the finished state. With refresh now in document order
// (MobileStage `refreshPriority`) it would start playing on arrival; to keep
// the mobile story exactly as shipped, mobile keeps the finished (server-
// rendered) state. Pass true to get the reveal on mobile too (design call).
export function useSection08Timeline({ container, columns }: Refs, reducedMotion: boolean, enabled: boolean = true) {
  // Idle-deferred (lib/idleGsap.ts): this reveal sits far below the first
  // screen, so its setup stays out of the hydration commit.
  useIdleGsap(
    () => {
      if (reducedMotion) return;

      const columnEls = (columns.current ?? []).filter((el): el is HTMLDivElement => Boolean(el));
      if (!columnEls.length) return;

      gsap.set(columnEls, { opacity: 0, y: 28, scale: 0.94 });

      gsap.to(columnEls, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        stagger: 0.16,
        ease: eases.fabric,
        scrollTrigger: {
          trigger: container.current,
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      });
    },
    container,
    [reducedMotion],
    { enabled }
  );
}
