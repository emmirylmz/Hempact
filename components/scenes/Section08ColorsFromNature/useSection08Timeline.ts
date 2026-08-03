"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { gsap, eases } from "@/lib/gsapConfig";

type Refs = {
  container: RefObject<HTMLElement | null>;
  columns: RefObject<(HTMLDivElement | null)[]>;
};

export function useSection08Timeline({ container, columns }: Refs, reducedMotion: boolean) {
  useGSAP(
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
    { scope: container, dependencies: [reducedMotion] }
  );
}
