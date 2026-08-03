"use client";

import { useRef } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useIsMobile } from "@/lib/useIsMobile";
import { useSceneBackgroundFlow } from "@/lib/useSceneBackgroundFlow";
import { useSection05Stage, LAYER_ACCENTS } from "./useSection05Stage";

export function Section05PadLayers() {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const sectionRef = useRef<HTMLElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoMaskRef = useRef<HTMLDivElement>(null);
  const captionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // One settled resting color, same pattern every other section on the
  // site uses — the shared system (see useSceneBackgroundFlow) already
  // handles a smooth HSL-eased handoff *into* this from Section04's
  // paleHemp and *out* of this into Section06's softClayRose entirely on
  // its own; Section05 doesn't need any color logic of its own beyond
  // picking one tone. studioGray specifically (not one of the brand's
  // warmer tones) because it also matches ped1.1.mp4's own sampled studio
  // background exactly, so the video's mask-feathered edges have nothing
  // to seam against — and a neutral gray has no strong hue of its own to
  // fight either paleHemp (green) or softClayRose (pink) at either
  // boundary, which is what actually keeps both handoffs feeling smooth.
  // Disabled on mobile — see Section01FirstEncounter's own comment on
  // this pattern; this section's mobile rendering now lives inside
  // MobileStageRunA (MobileScene05.tsx).
  useSceneBackgroundFlow(sectionRef, colors.studioGray, !isMobile);
  useSection05Stage(
    { section: sectionRef, wrapperRef, video: videoRef, videoMask: videoMaskRef, captionRefs, tickRefs },
    reducedMotion,
    isMobile
  );

  const { section05 } = useContent();
  // Declared in base/core/distributor/top order (see content.ts) — the
  // requested text reveal order, deliberately not the order ped1.1.mp4's
  // own footage reveals them in (top-first, base-last). useSection05Stage.ts
  // times each caption to this same sequential order, so captions no longer
  // line up with what's physically on screen at each window — an accepted
  // tradeoff, not a bug.
  const layers = section05.layers;

  // hidden md:contents: see Section01FirstEncounter's own comment on this
  // pattern — this section's mobile rendering now lives entirely inside
  // MobileStageRunA (MobileScene05.tsx), so the min-h-dvh/z-index/
  // flex-centering this file briefly grew earlier today (to fix a
  // mobile-only pin/header-overlap bug) are no longer needed — that bug
  // and its fix are moot now that this desktop copy never renders on
  // mobile at all. Reverted to the original desktop-only layout.
  return (
    <div className="hidden md:contents">
    <section
      id="section-05-pad-layers"
      ref={sectionRef}
      className="relative w-full px-6 py-24 md:px-16"
    >
      {/* Scroll distance the sticky stage below scrubs against. */}
      <div ref={wrapperRef} className="relative mx-auto max-w-2xl md:h-[420dvh]">
        {/* justify-content:safe center (not a plain justify-center) plus
            md:pt-28 nav-clearance, same value the site's other sections
            already use for their own top padding — when this stage's total
            content (heading + video + captions) is taller than the pinned
            h-dvh box, a plain `center` overflows equally off *both*
            edges, which on shorter viewports pushed the heading above y:0
            and under the fixed header (position:fixed, so it renders on
            top of anything there). "safe" falls back to start-alignment
            from the padded top edge instead of overflowing off the start
            side, so the heading can never end up above that reserved
            clearance regardless of viewport height — verified via
            getBoundingClientRect at an 835px-tall viewport: heading top
            lands at 112px, 40px clear of the header's own 72px bottom
            edge. gap-8 (was gap-10) at md trims some of the stack's total
            height so there's less to push off the *bottom* edge instead
            (the tradeoff "safe" makes); some bottom overflow on unusually
            short viewports is possible but only touches the low-priority
            trailing caption text, never the heading. */}
        <div className="relative flex flex-col items-center gap-10 md:sticky md:top-0 md:h-dvh md:gap-8 md:pt-28 md:[justify-content:safe_center]">
          <h2
            className="max-w-xl text-center text-3xl leading-tight font-light sm:text-4xl"
            style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
          >
            {section05.heading}
          </h2>

          {/* Full-screen soft lift, centered on the *viewport* (inset-y-0
              spans this sticky container's full h-dvh height, and the
              calc(100vw-20px) width spans the full viewport width — not
              just the video's own box). A plain near-white brightening
              that fades to fully transparent (not to any specific color),
              so it reads correctly regardless of the page's own current
              hue during the handoffs to/from the neighboring sections.
              Clipped at the viewport's own width rather than a plain
              w-screen (a few px wider than the viewport on
              non-overlay-scrollbar setups — see
              [[section05_overflow_hidden_bug]]). */}
          <div
            className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 -translate-x-1/2 overflow-hidden"
            style={{ width: "calc(100vw - 20px)" }}
            aria-hidden
          >
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(circle at 50% 50%, ${colors.softIvory}45 0%, transparent 65%)` }}
            />
          </div>

          {/* The video itself has no visible frame — no border, no card
              shadow, no hard rounded-rect edge — on purpose: the point is
              for it to read as an atmospheric part of the page rather than
              an embedded video widget. Instead it dissolves straight into
              the ambient glow behind it via the mask below. This outer box
              is now purely a *positioning* reference (flex-centers the
              actual masked video within the stage's own 4:3 footprint) —
              it deliberately carries no mask of its own; see why on the
              inner div below. */}
          <div className="relative flex w-full max-w-2xl items-center justify-center md:aspect-[4/3]">
            {/* The mask (and the shadow tracing its resulting silhouette)
                lives on this wrapping <div>, never on the <video> element
                itself — masking a <video> directly is an unreliable
                cross-browser compositing path (see
                [[section05_video_mask_on_video_element_bug]]). Sized to
                aspect-video (16:9), matching the footage's own true aspect
                exactly, rather than the outer 4:3 stage box — this is the
                fix for a real bug: an earlier version put the mask on the
                *outer* mismatched box while the video itself only rendered
                a smaller, centered aspect-video region inside it, so
                "closest-side"'s own percentages (tuned for the outer box)
                finished fading only *after* the video's own smaller edge —
                the video's actual boundary was showing at partial opacity,
                a visible rectangle. Since this wrapper's own box now
                exactly equals the video's own rendered box, "closest-side"
                sizes to that box's own true edge directly (see
                [[video_mask_closest_side_bug]]) — the fade is guaranteed
                to complete *before* the video's real boundary by
                construction, not by having to hand-tune percentages
                against a separately-measured, easy-to-get-wrong content
                extent. w-[92%] (of the outer flex box) is what actually
                creates the "outer frame" margin now — pure layout, nothing
                to do with the mask math. useSection05Stage widens the fade
                slightly further as the closing beat settles. */}
            <div
              ref={videoMaskRef}
              className="relative aspect-video w-[92%] overflow-hidden"
              style={{
                // Very soft — now that the page background matches the
                // footage's own studio tone almost exactly, a heavier
                // shadow would be the one remaining thing making this read
                // as a distinct floating element rather than page content.
                filter: `drop-shadow(0 20px 36px ${colors.charcoal}18)`,
                // Matches useSection05Stage's own VIDEO_MASK formula at
                // progress 0 — set here too so the very first paint,
                // before any scroll-driven JS has run, already shows the
                // feathered edge instead of a hard, unmasked rectangle.
                maskImage: "radial-gradient(ellipse closest-side at 50% 50%, black 75%, transparent 97%)",
                WebkitMaskImage: "radial-gradient(ellipse closest-side at 50% 50%, black 75%, transparent 97%)",
              }}
            >
              {/* h-full w-full, no object-fit needed at all — this
                  wrapper's own box is already exactly aspect-video, so the
                  video fills it edge-to-edge with a 1:1 match; there's
                  never a mismatch for the browser to reconcile (and
                  therefore never a letterbox region it could paint black —
                  see the object-contain black-bar bug this replaced). All
                  the margin between this and the outer 4:3 stage is the
                  page's own shared background showing through —
                  invisible/seamless since useSceneBackgroundFlow above
                  keeps that background at studioGray, ped1.1.mp4's own
                  sampled tone, for this entire section. */}
              {/* `<source media>` instead of a plain `src` — see
                  Section01FirstEncounter.tsx's own comment (prevents a
                  real double-bandwidth mobile bug). */}
              <video
                ref={videoRef}
                muted
                playsInline
                preload="auto"
                aria-label={section05.imageAlt}
                className="h-full w-full"
              >
                <source src="/images/ped1.1.mp4" media="(min-width: 768px)" />
              </video>
            </div>
          </div>

          {/* Desktop-only, scroll-synced: a minimal position indicator
              (four ticks, not a video-style buffered progress bar — this
              is meant to read as a generic step indicator, not player
              chrome) followed by the caption itself, both keyed to the
              exact same eased value per layer (see useSection05Stage) so
              nothing can drift out of sync with the other. Sits in plain
              page space below the footage rather than overlaid on it —
              ordinary editorial text, not a video caption/subtitle. */}
          <div className="hidden md:flex md:flex-col md:items-center md:gap-5">
            <div className="flex items-center justify-center gap-2.5">
              {layers.map((layer, index) => (
                <span
                  key={layer.name}
                  ref={(el) => {
                    tickRefs.current[index] = el;
                  }}
                  aria-hidden
                  className="h-[3px] w-7 rounded-full"
                  style={{
                    backgroundColor: LAYER_ACCENTS[index],
                    boxShadow: `0 0 10px ${LAYER_ACCENTS[index]}70`,
                    opacity: 0.3,
                    transform: "scaleX(0.6)",
                  }}
                />
              ))}
            </div>

            <div className="grid min-h-[7.5rem] place-items-center text-center">
              {layers.map((layer, index) => (
                <div
                  key={layer.name}
                  ref={(el) => {
                    captionRefs.current[index] = el;
                  }}
                  className="[grid-area:1/1] opacity-0"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="text-xs font-medium tracking-[0.2em] tabular-nums"
                      style={{ color: LAYER_ACCENTS[index] }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      aria-hidden
                      className="h-px w-8"
                      style={{ background: `linear-gradient(90deg, ${LAYER_ACCENTS[index]}, transparent)` }}
                    />
                  </div>
                  <p
                    className="mt-3 text-2xl leading-tight font-light sm:text-3xl"
                    style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
                  >
                    {layer.name}
                  </p>
                  {/* Full charcoal, no opacity fade — at 0.72 this measured
                      a 3.66:1 effective contrast against studioGray, well
                      under WCAG AA's 4.5:1 minimum for normal text; full
                      opacity brings it to the same 6.51:1 the layer name
                      already gets. */}
                  <p className="mx-auto mt-2 max-w-md text-sm font-light sm:text-base" style={{ color: colors.charcoal }}>
                    {layer.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
    </div>
  );
}
