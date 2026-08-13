"use client";

import { useRef } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useIsMobile } from "@/lib/useIsMobile";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";
import { useLazyVideoSource } from "@/lib/useLazyVideoSource";
import { useSection10Timeline } from "./useSection10Timeline";
import { ImpactIllustration, VIDEO_RECT } from "./ImpactIllustration";

export function Section10SocialImpact() {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const firstDotRef = useRef<SVGCircleElement>(null);
  const dotsRef = useRef<SVGGElement>(null);
  const linesRef = useRef<SVGGElement>(null);
  const isVideoNear = useLazyVideoSource(containerRef, videoRef);

  // Disabled on mobile — see Section01FirstEncounter's own comment on
  // this pattern; this section's mobile rendering now lives inside
  // MobileStageRunB (MobileScene10.tsx).
  useSceneBackgroundFlow(containerRef, colors.paleHemp, !isMobile);
  useSection10Timeline(
    { container: containerRef, svg: svgRef, video: videoRef, firstDot: firstDotRef, dots: dotsRef, lines: linesRef },
    reducedMotion,
    isMobile
  );

  const { section10 } = useContent();

  // hidden md:contents: see Section01FirstEncounter's own comment on this
  // pattern.
  return (
    <div className="hidden md:contents">
    <section
      id="section-10-social-impact"
      ref={containerRef}
      // z-[6]: see Section01FirstEncounter's own comment on this pattern.
      className="relative z-[6] flex min-h-[85dvh] w-full flex-col items-center overflow-hidden px-6 pt-28 pb-12 md:pt-32"
    >
      <div className="relative z-10 mb-2 max-w-xl text-center md:mb-3">
        <h2
          className="text-3xl leading-tight font-light sm:text-4xl md:text-5xl"
          style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
        >
          {section10.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light sm:text-base" style={{ color: colors.deepHemp }}>
          {section10.subheading}
        </p>
      </div>

      {/* items-start (not items-center) — this box is flex-1, spanning all
          the remaining space down to the section's own min-h-[85dvh]
          bottom, so centering its content vertically was leaving a large
          gap between the heading above and the figures, regardless of the
          heading's own margin. Starting it at the top of this box instead
          means the illustration begins right after the heading. */}
      <div className="relative z-10 flex w-full flex-1 items-start justify-center">
        <div
          className="pointer-events-none absolute h-[36dvh] w-[56dvh] rounded-full md:h-[42dvh] md:w-[64dvh]"
          style={{
            background: `radial-gradient(ellipse, ${colors.deepHemp}35, transparent 75%)`,
            filter: "blur(30px)",
          }}
          aria-hidden
        />

        {/* Sized exactly like the old SVG-only version was (w-[99vh]/
            md:w-[114vh], aspect matching its cropped 600x240 viewBox) —
            now holds both the video and the dot-network SVG as two
            same-sized, stacked layers instead of the SVG alone. */}
        <div className="relative aspect-[5/2] w-[99dvh] md:w-[114dvh]">
          {/* kadinsSon.webm positioned via VIDEO_RECT — percentages derived
              from the exact same geometry ImpactIllustration.tsx's dot
              network is built against (see that file), not hand-picked,
              so the footage lines up with where the network still expects
              it. object-cover crops a barely-there ~3% sliver off the
              sides (source is 16:9, this box is ~1.72:1) — imperceptible,
              and object-contain isn't needed here the way it was for
              ped1.1.mp4 (see [[section05_ped1_video_swap]]) since
              object-cover never creates an empty region for the browser to
              paint black in the first place. This file carries a real alpha
              channel — MP4/H.264 has no browser-viable transparency support,
              so it stays the primary source (see the Safari-fallback
              comment below for why that browser needs a differently-built
              second source rather than a plain re-mux). Unlike the previous
              kadinlar2.webm
              attempt (source video's own baked-in "WebM-alpha" side-channel
              data couldn't be trusted or verified), this source
              (kadinsSon.mov, Apple ProRes 4444) has no alpha at all but a
              rock-solid flat cream backdrop — chroma-keyed out via ffmpeg's
              colorkey filter before VP9 encoding, so the alpha channel is
              freshly generated by a filter this environment's tooling can
              actually verify pixel-by-pixel (confirmed: background alpha 0,
              figures alpha 255, <1% partial-alpha fringe), not read back out
              of a container side-channel. This also means no visible
              rectangular "video frame" to hide — a genuinely
              per-pixel-transparent clip has no bounding box to disguise, so
              no extra mask/vignette trick was needed on top of it. */}
          {/* Safari has no WebM decoder at all (let alone one that reads
              this file's per-pixel alpha), so it needs its own fallback —
              and unlike Section02/03/04's plain opaque clips, this one
              can't just be re-muxed as an opaque MP4 with the *same*
              footage: the transparency is load-bearing here (the dot
              network must show through the gaps around the figures, see
              the comment above). kadinsSon-fallback.mp4 is a *different*
              render of the same source — colorkeyed onto a solid
              paleHemp background (this section's own resting color,
              see useSceneBackgroundFlow above) instead of true alpha, so
              Safari gets a small rectangular seam against the dot network
              instead of nothing at all. See
              [[mobile_video_playback_fixes]]. */}
          <video
            ref={videoRef}
            muted
            playsInline
            preload="auto"
            aria-hidden
            className="absolute object-cover"
            style={{
              left: `${VIDEO_RECT.leftPct}%`,
              top: `${VIDEO_RECT.topPct}%`,
              width: `${VIDEO_RECT.widthPct}%`,
              height: `${VIDEO_RECT.heightPct}%`,
            }}
          >
            {/* `media` added to both — without it, the browser's own HTML
                parser was fetching kadinsSon.webm on mobile viewports too
                (confirmed via a real network trace), even though
                MobileScene10.tsx loads its own, entirely separate copy of
                the fallback mp4 for its canvas chroma-key. See
                Section01FirstEncounter.tsx's own comment on this class of
                bug. */}
            {isVideoNear && (
              <>
                <source src="/images/kadinsSon.webm" type="video/webm" media="(min-width: 768px)" />
                <source src="/images/kadinsSon-fallback.mp4" type="video/mp4" media="(min-width: 768px)" />
              </>
            )}
          </video>
          <ImpactIllustration ref={svgRef} firstDotRef={firstDotRef} dotsRef={dotsRef} linesRef={linesRef} />
        </div>
      </div>
    </section>
    </div>
  );
}
