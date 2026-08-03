"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { gsap, eases } from "@/lib/gsapConfig";

type Refs = {
  container: RefObject<HTMLElement | null>;
  image: RefObject<HTMLDivElement | null>;
  ring: RefObject<SVGCircleElement | null>;
  heading: RefObject<HTMLHeadingElement | null>;
  subheading: RefObject<HTMLParagraphElement | null>;
  cta: RefObject<HTMLButtonElement | null>;
};

export function useSection12Timeline({ container, image, ring, heading, subheading, cta }: Refs, reducedMotion: boolean) {
  useGSAP(
    () => {
      if (reducedMotion) return;
      if (!image.current || !ring.current) return;

      const ringLength = ring.current.getTotalLength();
      gsap.set(ring.current, { strokeDasharray: ringLength, strokeDashoffset: ringLength });
      gsap.set(image.current, { opacity: 0, scale: 0.9 });
      gsap.set([heading.current, subheading.current, cta.current], { opacity: 0, y: 16 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container.current,
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      });

      tl.to(image.current, { opacity: 1, scale: 1, duration: 1, ease: eases.fabric })
        .to(ring.current, { strokeDashoffset: 0, duration: 1.1, ease: eases.water }, "-=0.5")
        .to(heading.current, { opacity: 1, y: 0, duration: 0.7, ease: eases.fabric }, "-=0.5")
        .to(subheading.current, { opacity: 1, y: 0, duration: 0.6, ease: eases.fabric }, "-=0.35")
        .to(cta.current, { opacity: 1, y: 0, duration: 0.6, ease: eases.fabric }, "-=0.3");
    },
    { scope: container, dependencies: [reducedMotion] }
  );
}
