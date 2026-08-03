"use client";

import { useRef } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import { colors } from "@/lib/theme";
import { gsap, eases } from "@/lib/gsapConfig";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";

export type InfoClosingData = {
  heading: string;
  cta: string;
};

export function InfoClosing({ closing, ctaHref }: { closing: InfoClosingData; ctaHref: string }) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useSceneBackgroundFlow(containerRef, colors.warmLinen);

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.set([headingRef.current, ctaRef.current], { opacity: 0, y: 16 });
      gsap
        .timeline({
          scrollTrigger: { trigger: containerRef.current, start: "top 70%", toggleActions: "play none none reverse" },
        })
        .to(headingRef.current, { opacity: 1, y: 0, duration: 0.7, ease: eases.fabric })
        .to(ctaRef.current, { opacity: 1, y: 0, duration: 0.6, ease: eases.fabric }, "-=0.35");
    },
    { scope: containerRef, dependencies: [reducedMotion] }
  );

  return (
    <section
      ref={containerRef}
      // min-h-svh: see InfoHero.tsx's own comment.
      className="relative flex min-h-[70svh] w-full flex-col items-center justify-center px-6 py-24 text-center"
    >
      <h2
        ref={headingRef}
        className="max-w-xl text-3xl leading-tight font-light sm:text-4xl"
        style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
      >
        {closing.heading}
      </h2>
      <Link
        ref={ctaRef}
        href={ctaHref}
        scroll={!ctaHref.includes("#")}
        className="mt-8 rounded-full px-8 py-3 text-xs tracking-[0.2em] uppercase transition-transform hover:scale-105"
        style={{ backgroundColor: colors.deepHemp, color: colors.softIvory }}
      >
        {closing.cta}
      </Link>
    </section>
  );
}
