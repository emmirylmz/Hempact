"use client";

import { useEffect, useRef } from "react";
import { preload } from "react-dom";
import { SceneWrapper } from "@/components/scroll/SceneWrapper";
import { markHeroMediaStarted, DESKTOP_SOURCE_MEDIA } from "@/lib/useLazyVideoSource";
import { useReloadWhenSourceMatches } from "@/lib/videoSourceMatch";
import media from "@/public/images/v2/manifest.json";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useIsMobile } from "@/lib/useIsMobile";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";
import { useSection01Timeline } from "./useSection01Timeline";
import { useSection01VideoScrub } from "./useSection01VideoScrub";
import { TriToneBackground } from "./TriToneBackground";

const HERO = media["hero-plant-growth"];

export function Section01FirstEncounter() {
  // Hero poster preload (bulgu #4): `ReactDOM.preload` is this Next/React
  // version's documented way to emit `<link rel="preload">` from a
  // component (node_modules/next/dist/docs/.../generate-metadata.md,
  // "Resource hints"); it's hoisted into <head> during SSR and deduped by
  // href. One per breakpoint, `media`-gated so each viewport fetches only
  // its own frame (the mobile one is MobileScene01's poster). The poster is
  // the video's own first frame, so it's exactly what this box shows until
  // the reader first scrolls.
  preload(HERO.poster, { as: "image", fetchPriority: "high", media: "(min-width: 768px)" });
  preload(HERO.posterMobile, { as: "image", fetchPriority: "high", media: "(max-width: 767.98px)" });

  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subheadingRef = useRef<HTMLParagraphElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);
  useSection01Timeline(
    { container: containerRef, image: imageRef, heading: headingRef, subheading: subheadingRef, scrollCue: scrollCueRef },
    reducedMotion,
    undefined,
    isMobile ? "off" : "handoff"
  );
  // QC2 K2: the hero `<source>` is in the server HTML, so the hero video
  // downloads with the page itself (it used to wait ~2 s for the entrance
  // reveal and then raced Section02). The other scenes' lazy videos open
  // their startup gate only once this one can actually play (`canplay`;
  // see lib/useLazyVideoSource.ts). On mobile this copy's source never
  // matches, so the gate falls back to its timeout — mobile scenes use
  // their own scheduler anyway.
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    if (videoEl.readyState >= 3) {
      markHeroMediaStarted();
      return;
    }
    const onCanPlay = () => markHeroMediaStarted();
    videoEl.addEventListener("canplay", onCanPlay, { once: true });
    return () => videoEl.removeEventListener("canplay", onCanPlay);
  }, []);
  // Grows the plant as the reader scrolls, instead of just autoplaying —
  // desktop only (see the hook for the mobile/reduced-motion fallback).
  useSection01VideoScrub({ container: containerRef, video: videoRef }, reducedMotion, isMobile);
  // Loaded at a mobile width, then widened (Q6-3).
  useReloadWhenSourceMatches(videoRef, DESKTOP_SOURCE_MEDIA);
  // A representative mid-tone of the hero's own light→dark green sweep
  // (see TriToneBackground) rather than the page's usual warmLinen, so the
  // handoff to/from neighboring sections during scroll stays green-toned
  // instead of jumping to a warm beige. Disabled on mobile — this section's
  // mobile rendering now lives inside MobileStageRunA (see
  // components/scroll/MobileStage.tsx), which drives the same shared
  // background layer itself; this desktop copy is CSS-hidden
  // (`display:none`) on mobile, and would otherwise register a
  // degenerate/zero-rect entry that fights the stage's own writes.
  useSceneBackgroundFlow(containerRef, colors.mistSage, !isMobile);

  const { section01 } = useContent();

  // z-[24]: descending z-index across all 12 sections (24→2, matching
  // page.tsx's render order), well below NavBar's z-50/z-40. Sibling
  // elements with position other than static and z-index:auto stack by
  // DOM order, so a later section paints *over* an earlier one that's
  // currently GSAP-pinned (position:fixed) purely because it comes later
  // in the tree — descending z-index guarantees whichever section is
  // currently pinned always wins that fight, instead of the next
  // section's content bleeding over it once their boxes start to
  // geometrically overlap on screen. See [[mobile_scroll_architecture]].
  // hidden md:contents: this section's mobile rendering has moved into
  // MobileStageRunA (components/scroll/MobileStage.tsx via
  // MobileScene01.tsx) — this desktop copy stays mounted (avoids any
  // isMobile-driven JSX branch / hydration-mismatch risk, matching
  // lib/useIsMobile.ts's own documented invariant) but is fully removed
  // from layout below `md:` (`display:none`) and behaves as if this
  // wrapper didn't exist at `md:`+ (`display:contents`), so it doesn't
  // disturb <main>'s normal flow there.
  return (
    <div className="hidden md:contents">
      <SceneWrapper id="section-01-first-encounter" ref={containerRef} className="z-[24] px-6">
        <TriToneBackground />

      {/* hero-enter-*: the entrance runs in CSS from first paint (see
          app/globals.css and useSection01Timeline's handoff). */}
      <div ref={imageRef} className="hero-enter-image relative z-10 mb-8 w-full max-w-xl px-10 sm:px-6">
        {/* Glow "echo" behind the footage — the same paleHemp→deepHemp sweep
            as TriToneBackground, softened and scaled up well past the
            video's own box. This is what actually sells the seam: the mask
            below only has to fade the footage into *this* echo (which
            already shares its exact hue at every point), not straight into
            the page, so any residual mismatch dissolves in soft color
            rather than reading as an edge. The softening used to be a
            `filter: blur(60px)`; `.hero-glow-echo` now produces the same
            blurred-rectangle falloff with a static mask (bulgu #10). The
            ramp spans exactly the original box (120px in from each side of
            the grown mask box), flat colour beyond — what the blur did. */}
        <div className="pointer-events-none absolute inset-0 -z-10 scale-[1.9]" style={{ opacity: 0.9 }} aria-hidden>
          <div
            className="hero-glow-echo"
            style={{
              background: `linear-gradient(90deg, ${colors.paleHemp} 120px, ${colors.deepHemp} calc(100% - 120px))`,
            }}
          />
        </div>
        {/* No card, border, or shadow. `closest-side` is load-bearing here,
            not decorative — it's the only ellipse sizing that *guarantees*
            full transparency is reached before the box's own edge, on any
            aspect ratio. A fixed-percentage ellipse (e.g. "62% 62%", used
            elsewhere) only reaches ~81% of its own radius at a rectangular
            box's edge, so if its transparent stop sits any later than that
            (it did, at 92%) the box's actual boundary is still partly
            opaque — a visible straight edge. `closest-side` can't make that
            mistake: by definition the ellipse touches the nearest edge at
            100% of its own extent, so finishing the fade at 88% always
            clears it with margin, on every screen size. */}
        <div className="relative w-full" style={{ aspectRatio: "1280 / 720" }}>
          {/* `<source media="...">` instead of a plain `src` — this
              wrapper's `hidden md:contents` only removes the element from
              *layout* below `md:`, it doesn't stop the browser's own HTML
              parser from eagerly fetching a `src` attribute it finds in
              the raw markup (confirmed via a real network trace: on a
              mobile viewport, both this desktop copy's video *and*
              MobileScene01.tsx's own copy of the same file were being
              downloaded simultaneously — literal double bandwidth/decode
              cost for a file that's never even visible here, a real
              contributor to "site feels laggy on mobile"). A `<source
              media>` query is evaluated natively by the browser against
              the real viewport before it decides what to fetch at all —
              no React/JS/hydration timing involved, so it correctly skips
              fetching this file below the same `768px` this wrapper's own
              `md:` breakpoint already uses, matching exactly whether this
              copy is actually visible. See
              [[mobile_unified_stage_architecture]]. */}
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            poster={HERO.poster}
            aria-label={section01.imageAlt}
            className="h-full w-full object-contain"
            style={{
              maskImage: "radial-gradient(ellipse closest-side at 50% 52%, black 70%, transparent 92%)",
              WebkitMaskImage: "radial-gradient(ellipse closest-side at 50% 52%, black 70%, transparent 92%)",
            }}
          >
            <source src={HERO.desktop} media="(min-width: 768px)" />
          </video>
        </div>
      </div>

      <h1
        ref={headingRef}
        className="hero-enter-heading relative z-10 max-w-3xl text-center text-3xl leading-tight font-light sm:text-4xl md:text-5xl"
        style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
      >
        {section01.heading}
      </h1>

      <p
        ref={subheadingRef}
        className="hero-enter-subheading relative z-10 mx-auto mt-5 max-w-md text-center text-sm font-light sm:text-base"
        style={{ color: colors.deepHemp }}
      >
        {section01.subheading}
      </p>

      <div
        ref={scrollCueRef}
        className="hero-enter-cue absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-[11px] tracking-[0.3em] uppercase"
        style={{ color: colors.charcoal }}
      >
        {section01.scrollCue}
      </div>
      </SceneWrapper>
    </div>
  );
}
