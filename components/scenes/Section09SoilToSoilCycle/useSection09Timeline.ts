"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { gsap } from "@/lib/gsapConfig";
import { stagePoint } from "./CycleIllustration";

type Refs = {
  container: RefObject<HTMLElement | null>;
  marker: RefObject<SVGCircleElement | null>;
  trail: RefObject<SVGCircleElement | null>;
  labels: RefObject<(HTMLDivElement | null)[]>;
};

const R = 150;
const CIRCUMFERENCE = 2 * Math.PI * R;

export function useSection09Timeline(
  { container, marker, trail, labels }: Refs,
  reducedMotion: boolean,
  isMobile: boolean,
  stageCount: number
) {
  useGSAP(
    () => {
      if (reducedMotion) return;

      const labelEls = (labels.current ?? []).filter((el): el is HTMLDivElement => Boolean(el));

      if (isMobile) {
        // No-op: this section's mobile rendering (including the marker/
        // trail/label timeline, ported to a real mobile pin for the first
        // time — this used to be just a one-shot label fade-in, not the
        // desktop-matching scrub below) now lives inside MobileStageRunB
        // — see components/scroll/MobileStage.tsx and MobileScene09.tsx.
        return;
      }

      if (!marker.current) return;
      gsap.set(labelEls, { opacity: 0.25 });

      const proxy = { angle: 0 };
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top top",
          end: "+=260%",
          pin: true,
          anticipatePin: 1,
          scrub: 1,
        },
      });

      // A single marker travels the full circle once as the user scrolls,
      // brightening each stage's label as it passes.
      tl.to(proxy, {
        angle: Math.PI * 2,
        duration: stageCount,
        ease: "none",
        onUpdate: () => {
          const cx = 200 + 150 * Math.cos(proxy.angle - Math.PI / 2);
          const cy = 200 + 150 * Math.sin(proxy.angle - Math.PI / 2);
          marker.current?.setAttribute("cx", String(cx));
          marker.current?.setAttribute("cy", String(cy));
          const progress = proxy.angle / (Math.PI * 2);
          trail.current?.setAttribute("stroke-dashoffset", String(CIRCUMFERENCE * (1 - progress)));
        },
      });

      labelEls.forEach((el, i) => {
        const target = stagePoint(i, stageCount);
        void target;
        tl.to(el, { opacity: 1, duration: 0.3 }, i).to(el, { opacity: 0.35, duration: 0.3 }, i + 0.7);
      });
      tl.to(labelEls[labelEls.length - 1] ?? {}, { opacity: 1, duration: 0.3 }, stageCount - 0.3);
    },
    { scope: container, dependencies: [reducedMotion, isMobile] }
  );
}
