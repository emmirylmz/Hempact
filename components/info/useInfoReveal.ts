"use client";

import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";
import { gsap, eases } from "@/lib/gsapConfig";

type Refs = {
  container: RefObject<HTMLElement | null>;
  icon: RefObject<HTMLDivElement | null>;
  body: RefObject<HTMLDivElement | null>;
};

// Simple fade-up reveal, not a pinned scrub — this page is a manifesto to be
// read, not a product demo to be scrubbed through, so it intentionally
// borrows the site's simpler reveal idiom (Section11/Section12's own
// pattern) rather than the video-driven pin timelines used elsewhere.
export function useInfoReveal({ container, icon, body }: Refs, reducedMotion: boolean) {
  useGSAP(
    () => {
      if (reducedMotion) return;
      if (!icon.current || !body.current) return;

      gsap.set(icon.current, { opacity: 0, y: 24, scale: 0.92 });
      gsap.set(body.current, { opacity: 0, y: 24 });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: container.current, start: "top 70%", toggleActions: "play none none reverse" },
      });

      tl.to(icon.current, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: eases.fabric }).to(
        body.current,
        { opacity: 1, y: 0, duration: 0.8, ease: eases.fabric },
        "-=0.5"
      );
    },
    { scope: container, dependencies: [reducedMotion] }
  );
}
