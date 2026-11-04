"use client";

import { useRef } from "react";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { preloadGsap, useLazyGsap, useLazySceneBackgroundFlow } from "@/lib/lazyGsap";

// Q8-1: GSAP is loaded on demand (lib/lazyGsap.ts); the request starts as
// soon as this first-screen module is evaluated.
preloadGsap();

export type InfoHeroData = {
  eyebrow: string;
  heading: string;
  scrollCue: string;
};

export function InfoHero({ hero }: { hero: InfoHeroData }) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cueRef = useRef<HTMLParagraphElement>(null);

  useLazySceneBackgroundFlow(containerRef, colors.warmLinen);

  useLazyGsap(
    ({ gsap, eases }) => {
      gsap.set([eyebrowRef.current, headingRef.current, cueRef.current], { opacity: 0, y: 20 });
      gsap
        .timeline({ delay: 0.2 })
        .to(eyebrowRef.current, { opacity: 1, y: 0, duration: 0.7, ease: eases.fabric })
        .to(headingRef.current, { opacity: 1, y: 0, duration: 0.9, ease: eases.fabric }, "-=0.4")
        .to(cueRef.current, { opacity: 1, y: 0, duration: 0.6, ease: eases.fabric }, "-=0.3");
    },
    containerRef,
    [],
    { enabled: !reducedMotion }
  );

  return (
    <section
      ref={containerRef}
      // min-h-svh, not min-h-dvh: this is a plain scrolling page, not a
      // GSAP-pinned one (see SceneWrapper.tsx's own comment for why the
      // home page's pinned sections genuinely need dvh's live-tracking
      // behavior). Here, several full-height sections stack in normal
      // document flow with nothing recomputing their positions — `dvh`
      // changing abruptly whenever the mobile browser's chrome snaps
      // shown/hidden (most noticeable on a quick scroll-direction
      // reversal) reflows every one of them at once, which is exactly the
      // "jumpback" feeling reported. `svh` (the smallest possible
      // viewport, chrome always accounted for) never changes during
      // scroll, at the minor cost of a bit of extra whitespace once the
      // chrome actually hides — see [[mobile_scroll_architecture]].
      className="relative flex min-h-svh w-full flex-col items-center justify-center overflow-hidden px-6 text-center"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(closest-side, ${colors.mutedHemp}30, transparent 70%), radial-gradient(closest-side, ${colors.softClayRose}1c, transparent 75%)`,
        }}
        aria-hidden
      />
      <p ref={eyebrowRef} className="text-xs tracking-[0.3em] uppercase" style={{ color: colors.mutedCycleRed }}>
        {hero.eyebrow}
      </p>
      <h1
        ref={headingRef}
        className="mt-6 max-w-3xl text-4xl leading-tight font-light sm:text-5xl md:text-6xl"
        style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
      >
        {hero.heading}
      </h1>
      <p ref={cueRef} className="mt-10 text-xs tracking-[0.2em] uppercase" style={{ color: colors.charcoal, opacity: 0.5 }}>
        {hero.scrollCue}
      </p>
    </section>
  );
}
