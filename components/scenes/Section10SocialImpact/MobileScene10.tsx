"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { gsap, eases } from "@/lib/gsapConfig";
import { useChromaKeyVideo } from "@/lib/useChromaKeyVideo";
import { MOBILE_SOURCE_MEDIA } from "@/lib/mobileMedia";
import { scheduleIdle } from "@/lib/idleGsap";
import { ImpactIllustration, VIDEO_RECT } from "./ImpactIllustration";

// paleHemp (#DCE3D2) in RGB — the exact flat backdrop
// kadinsSon-fallback.mp4 is already colorkeyed onto (see
// [[mobile_video_playback_fixes]]). Keyed back out via
// lib/useChromaKeyVideo.ts's shared canvas chroma-key (see that file for
// the full technique/rationale) instead of relying on the video codec's
// own native alpha support (kadinsSon.webm's real VP9 alpha, which
// desktop uses) — that was dropped for mobile because it decodes as
// opaque white on some mobile browsers, a real, confirmed, codec-level
// compatibility issue outside this codebase's control.
const KEY: [number, number, number] = [220, 227, 210];

// The hook's own defaults (12/10) were tuned against this clip's *flat*
// border backdrop, which really is that consistent (checked again via a
// real per-frame border-pixel sample across the whole clip: mode color
// stayed at [218,225,209], only ~3 units from KEY, in every one of 20
// sampled frames). The residual "background peeking through between
// scenes" report is from a different source: this is an *animated* clip
// (moving figures/dots), and frames mid-motion carry compression
// blur/shading near those moving edges that isn't perfectly flat — those
// transitional pixels can sit just outside the old threshold+feather
// reach (22) and stay fully opaque instead of reading as background.
// Loosened slightly to give more headroom for that per-frame variance.
// Safe to loosen here specifically (unlike Section02's own history of a
// threshold being tightened after eating real content) because this
// hook's border-connected flood fill already protects any real,
// non-border-connected content that happens to be close in color to the
// key — a plain distance widen only affects genuinely border-connected
// background.
const CHROMA_OPTIONS = { threshold: 16, feather: 14 };

// A <line>'s getTotalLength() is exactly its endpoint distance; computed
// from the attributes so it needs no layout (getTotalLength() forces one).
function lineLength(line: SVGLineElement) {
  const n = (name: string) => Number(line.getAttribute(name) ?? 0);
  return Math.hypot(n("x2") - n("x1"), n("y2") - n("y1"));
}

// True while MobileStage still keeps this scene out of rendering
// (`content-visibility: hidden` on the scene wrapper's inline style).
function isInHiddenScene(el: Element | null) {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    const value = node.style.contentVisibility;
    if (value) return value === "hidden";
  }
  return false;
}

// Pre-blurred halo (Faz 2 / P2, bulgu #10): the old
// `radial-gradient(ellipse, deepHemp35, transparent 75%)` + `blur(30px)`
// layer, sampled from Chromium's own blurred render at 390x844 into plain
// gradient stops (deepHemp = rgb(64,85,72)). Measured against the original:
// max 3.0/255, mean 0.43/255 per channel.
const HALO_10 =
  "radial-gradient(ellipse 41.4% 36.6% at 50% 50%, rgba(64,85,72,0.165) 0%, rgba(64,85,72,0.165) 5.6%, rgba(64,85,72,0.157) 11.1%, rgba(64,85,72,0.149) 16.7%, rgba(64,85,72,0.141) 22.2%, rgba(64,85,72,0.133) 27.8%, rgba(64,85,72,0.125) 33.3%, rgba(64,85,72,0.11) 38.9%, rgba(64,85,72,0.098) 44.4%, rgba(64,85,72,0.086) 50%, rgba(64,85,72,0.075) 55.6%, rgba(64,85,72,0.063) 61.1%, rgba(64,85,72,0.051) 66.7%, rgba(64,85,72,0.039) 72.2%, rgba(64,85,72,0.027) 77.8%, rgba(64,85,72,0.016) 83.3%, rgba(64,85,72,0.008) 88.9%, rgba(64,85,72,0.004) 94.4%, transparent 100%)";

// Mobile-only rendering of Section10, hosted inside MobileStageRunB — see
// MobileScene02.tsx's own comment. Unlike most other MobileSceneNN.tsx
// files, the dot-network reveal here IS ported from desktop
// (useSection10Timeline.ts) instead of being skipped — it wasn't wired to
// anything at all before this (ImpactIllustration.tsx's dots/lines just
// sat at their static full-opacity/fully-drawn markup state always, with
// no scroll relationship whatsoever), which is what "kırmızı noktalı
// animasyonu sayfa kaydırmasına entegre çalışır hale getir" was reporting
// — not a tuning request, a genuinely missing feature. The video's own
// separate opacity fade-in tween IS still skipped (the stage's own
// scene-level cross-fade already covers that, same reasoning as every
// other MobileSceneNN.tsx).
export function MobileScene10({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const firstDotRef = useRef<SVGCircleElement>(null);
  const dotsRef = useRef<SVGGElement>(null);
  const linesRef = useRef<SVGGElement>(null);
  const { section10 } = useContent();

  // A paused GSAP timeline scrubbed by `.progress(localProgress)` instead
  // of manually re-deriving desktop's position args (`0.4`, `1`, `1.8`)
  // and easing curves (`power3.out`/`power2.inOut`) into a hand-written
  // function the way MobileScene09's `labelOpacity` did — GSAP's own
  // `.progress()` on a plain timeline is mathematically identical to how
  // ScrollTrigger drives a scrubbed timeline (both just set the
  // timeline's position from a 0–1 fraction of its own total duration),
  // so this reproduces desktop's exact reveal curve with no risk of a
  // subtly-wrong hand-ported easing function, and no need to touch
  // ImpactIllustration.tsx or useSection10Timeline.ts at all.
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // Built lazily, not on mount (QC5 / early-scroll jank): building it sets
  // SVG transforms (GSAP reads getBBox) and dash lengths inside this scene's
  // still `content-visibility: hidden` subtree, which forced that subtree's
  // first style + layout: 150-220 ms at 4x CPU inside the hydration commit,
  // and inside the reader's first touch when that arrived during hydration.
  // Now it is built in an idle callback once MobileStage has rendered the
  // scene (its layout is then already paid, the build is cheap), or at the
  // latest on the first tick with progress > 0 — the scene is at opacity 0
  // until then (its own fade-in lane), so nothing visible depends on it
  // earlier. Same tweens, same initial state, same positions as before.
  const buildTimeline = useCallback(() => {
    if (tlRef.current) return tlRef.current;
    const firstDot = firstDotRef.current;
    const dotsEl = dotsRef.current;
    const linesEl = linesRef.current;
    if (!firstDot || !dotsEl || !linesEl) return null;

    const dotEls = Array.from(dotsEl.children);
    const lineEls = Array.from(linesEl.children) as SVGLineElement[];

    // Same initial hidden state as useSection10Timeline.ts's own
    // gsap.set() calls — must precede building the timeline below so its
    // `.to()` tweens capture these as their "from" values.
    gsap.set(firstDot, { scale: 0, transformOrigin: "300px 260px" });
    gsap.set(dotEls, { opacity: 0, scale: 0 });
    lineEls.forEach((line) => {
      gsap.set(line, { strokeDasharray: lineLength(line), strokeDashoffset: lineLength(line) });
    });

    tlRef.current = gsap.timeline({ paused: true })
      .to(firstDot, { scale: 1, duration: 0.5, ease: eases.fabric }, 0.4)
      .to(dotEls, { opacity: 1, scale: 1, duration: 0.5, ease: eases.fabric, stagger: 0.06 }, 1)
      .to(lineEls, { strokeDashoffset: 0, duration: 1, ease: eases.water, stagger: 0.03 }, 1.8);
    return tlRef.current;
  }, []);

  useEffect(() => {
    let cancel = () => {};
    const tryBuild = () => {
      // Desktop (this copy is display:none): nothing to prepare; the tick
      // fallback still covers a later resize to mobile.
      if (tlRef.current || !window.matchMedia(MOBILE_SOURCE_MEDIA).matches) return;
      if (isInHiddenScene(svgRef.current)) cancel = scheduleIdle(tryBuild, 2000);
      else buildTimeline();
    };
    cancel = scheduleIdle(tryBuild, 2000);
    return () => {
      cancel();
      tlRef.current?.kill();
      tlRef.current = null;
    };
  }, [buildTimeline]);

  // Lazy <source>, deferred iOS priming and the pre-keyed alpha poster
  // placeholder: see lib/useChromaKeyVideo.ts + lib/mobileMedia.ts.
  const media = useChromaKeyVideo("10", videoRef, canvasRef, onProgressRef, KEY, {
    ...CHROMA_OPTIONS,
    onTick: (localProgress) => {
      const tl = tlRef.current ?? (localProgress > 0 ? buildTimeline() : null);
      tl?.progress(localProgress);
    },
  });

  return (
    // pt-28 + [justify-content:safe_center]: see MobileScene01.tsx's own
    // comment on this pattern (was pt-16, less than the header's ~72px).
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden px-6 pt-28 pb-8 [justify-content:safe_center]">
      <div className="relative z-10 mb-2 max-w-xl text-center">
        <h2
          className="text-3xl leading-tight font-light"
          style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
        >
          {section10.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light" style={{ color: colors.deepHemp }}>
          {section10.subheading}
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-start justify-center">
        {/* Was a rounded 56dvh x 36dvh box with radial-gradient(ellipse,
            deepHemp35, transparent 75%) + filter: blur(30px). Now the
            pre-blurred result on a box grown by 3σ = 30px·3 on each side
            (calc keeps the same centre in this flex row) — see HALO_10. */}
        <div
          className="pointer-events-none absolute h-[calc(36dvh+180px)] w-[calc(56dvh+180px)] -translate-y-[90px]"
          style={{ background: HALO_10 }}
          aria-hidden
        />

        <div className="relative aspect-[5/2] w-[99dvh]">
          {/* Hidden — used only as a decode/draw source for the visible
              canvas below, not rendered directly (its own background is
              still flatly opaque paleHemp, not transparent). Stays laid
              out (opacity-0, not display:none) so it keeps decoding.
              `<source media>` instead of a plain `src` — see
              MobileScene01.tsx's own comment (opacity-0 doesn't stop the
              browser from eagerly fetching a raw `src` attribute either). */}
          <video
            ref={videoRef}
            muted
            playsInline
            preload={media.preload}
            aria-hidden
            className="absolute opacity-0"
            style={{
              left: `${VIDEO_RECT.leftPct}%`,
              top: `${VIDEO_RECT.topPct}%`,
              width: `${VIDEO_RECT.widthPct}%`,
              height: `${VIDEO_RECT.heightPct}%`,
            }}
          >
            {media.attached && <source src={media.src} type="video/mp4" media={MOBILE_SOURCE_MEDIA} />}
          </video>
          {/* The actual visible layer — each drawn frame has its flat
              paleHemp backdrop keyed out in JS, so this canvas is
              genuinely transparent where the backdrop was, same as
              desktop's real-alpha WebM. */}
          <canvas
            ref={canvasRef}
            aria-hidden
            className="absolute object-cover"
            style={{
              left: `${VIDEO_RECT.leftPct}%`,
              top: `${VIDEO_RECT.topPct}%`,
              width: `${VIDEO_RECT.widthPct}%`,
              height: `${VIDEO_RECT.heightPct}%`,
            }}
          />
          <ImpactIllustration ref={svgRef} firstDotRef={firstDotRef} dotsRef={dotsRef} linesRef={linesRef} />
        </div>
      </div>
    </div>
  );
}
