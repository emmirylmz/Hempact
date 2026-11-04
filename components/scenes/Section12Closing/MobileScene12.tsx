"use client";

import { useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { scrubVideoToProgress } from "@/lib/useMobileVideoScrub";
import { MOBILE_SOURCE_MEDIA, useMobileSceneMedia, useMobileScrub } from "@/lib/mobileMedia";
import { useScrollToSection } from "@/components/scroll/scrollContext";
import { useSection12Timeline } from "./useSection12Timeline";

// Pre-blurred halo (Faz 2 / P2, bulgu #10): the old two-colour radial
// gradient + `blur(24px)` layer behind the video, sampled from Chromium's own
// blurred render at 390px into plain gradient stops. Measured against the
// original: max 4.1/255, mean 0.33/255 per channel.
const HALO_12 =
  "radial-gradient(ellipse 42% 33.8% at 50% 51.4%, rgba(191,197,184,0.451) 0%, rgba(192,199,183,0.447) 5.6%, rgba(194,200,187,0.439) 11.1%, rgba(194,204,187,0.427) 16.7%, rgba(197,204,190,0.416) 22.2%, rgba(200,207,195,0.4) 27.8%, rgba(206,213,198,0.384) 33.3%, rgba(208,217,200,0.365) 38.9%, rgba(214,220,205,0.341) 44.4%, rgba(217,223,207,0.314) 50%, rgba(222,230,211,0.275) 55.6%, rgba(221,225,212,0.235) 61.1%, rgba(217,228,212,0.184) 66.7%, rgba(218,232,210,0.133) 72.2%, rgba(218,232,210,0.086) 77.8%, rgba(218,232,210,0.047) 83.3%, rgba(218,232,210,0.02) 88.9%, rgba(218,232,210,0.008) 94.4%, transparent 100%)";

// Static stand-in for the video's old chained drop-shadows (charcoal =
// rgb(44,48,44); 0x30 = 0.188, 0x20 = 0.125; third = 2nd shadow of the 1st).
const S12_SHADOW =
  "0 26px 60px rgba(44,48,44,0.188), 0 8px 20px rgba(44,48,44,0.125), 0 34px 63.2px rgba(44,48,44,0.0235)";

// Mobile-only rendering of Section12, hosted inside MobileStageRunC (see
// components/scroll/MobileStage.tsx) — the sole scene in this run, last
// section on the page. Reuses useSection12Timeline as-is (its own
// "top 70%" toggle reveal isn't scroll-scrub-tied, so it works unchanged
// with its own fresh refs here, same as MobileScene01.tsx reusing
// useSection01Timeline).
export function MobileScene12({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subheadingRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const scrollToSection = useScrollToSection();
  const { section12 } = useContent();

  useSection12Timeline(
    { container: containerRef, image: imageRef, ring: ringRef, heading: headingRef, subheading: subheadingRef, cta: ctaRef },
    reducedMotion,
    // Off on mobile, see useSection12Timeline's `enabled`: the shipped
    // mobile story shows this scene already revealed (its trigger used to
    // fire before the reader got here). Pass `useIsMobile()` to play it.
    false
  );

  // Lazy <source>/poster + deferred, sequential iOS priming: see
  // lib/mobileMedia.ts. The scrub itself is the same scrubVideoToProgress
  // call as before; useMobileScrub only re-applies the last progress once a
  // lazily attached video's metadata arrives.
  const media = useMobileSceneMedia("12", videoRef);
  useMobileScrub(videoRef, onProgressRef, scrubVideoToProgress);

  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      // pt-28 + [justify-content:safe_center]: see MobileScene01.tsx's
      // own comment on this pattern (was plain justify-center, no top
      // clearance).
      className="relative flex h-full w-full flex-col items-center overflow-hidden px-6 pt-28 pb-8 [justify-content:safe_center]"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(closest-side, ${colors.mutedHemp}30, transparent 70%), radial-gradient(closest-side, ${colors.softClayRose}1c, transparent 75%)`,
        }}
        aria-hidden
      />

      <div ref={imageRef} className="relative z-10 mb-8">
        {/* Was radial-gradient(ellipse 62% 58% at 50% 52%, mistSage80,
            paleHemp55 45%, transparent 75%) + filter: blur(24px); now the
            pre-blurred result, see HALO_12's comment (box extended by
            3σ = 72px). */}
        <div
          className="pointer-events-none absolute -z-10 scale-125"
          style={{ inset: "-72px", background: HALO_12 }}
          aria-hidden
        />
        <svg viewBox="0 0 340 340" width="340" height="340" className="pointer-events-none absolute -inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)]" aria-hidden>
          <circle ref={ringRef} cx="170" cy="170" r="160" fill="none" stroke={colors.mutedCycleRed} strokeWidth="2" />
        </svg>
        {/* The video's soft shadow, as a static layer under it (Faz 2 / P2,
            QC2 O3). The video box is taller than 16:9 on phones (342x321
            at 390px: 38dvh tall, width capped by the column), so the
            footage is letterboxed in the middle and the old
            `drop-shadow(0 26px 30px charcoal30) drop-shadow(0 8px 10px
            charcoal20)` on the <video> showed in the band below it, inside
            the mask's opaque area. Same geometry here: a 16:9 rect centred
            in the same box, `box-shadow` (blur = 2σ, since drop-shadow's
            length is σ itself) incl. the second shadow's shadow of the
            first, under the very same mask. Measured against the old
            filter: max 4/255, mean 0.18/255. -z-[1]: above the halo
            (-z-10), below the video, as before. */}
        <div
          className="pointer-events-none absolute inset-0 -z-[1]"
          style={{
            maskImage: "radial-gradient(ellipse closest-side at 50% 50%, black 68%, transparent 90%)",
            WebkitMaskImage: "radial-gradient(ellipse closest-side at 50% 50%, black 68%, transparent 90%)",
          }}
          aria-hidden
        >
          <div className="absolute inset-x-0 top-1/2 aspect-video max-h-full w-full -translate-y-1/2" style={{ boxShadow: S12_SHADOW }} />
        </div>
        {/* `<source media>` instead of a plain `src` — see
            MobileScene01.tsx's own comment. */}
        <video
          ref={videoRef}
          muted
          playsInline
          preload={media.preload}
          poster={media.poster}
          aria-label={section12.imageAlt}
          className="h-[38dvh] w-auto object-contain"
          style={{
            maskImage: "radial-gradient(ellipse closest-side at 50% 50%, black 68%, transparent 90%)",
            WebkitMaskImage: "radial-gradient(ellipse closest-side at 50% 50%, black 68%, transparent 90%)",
            // The `drop-shadow` pair that used to sit here now lives on the
            // static sibling layer above (S12_SHADOW) — no per-frame filter
            // pass on a scrubbing video.
          }}
        >
          {media.attached && <source src={media.src} type="video/mp4" media={MOBILE_SOURCE_MEDIA} />}
        </video>
      </div>

      <h2
        ref={headingRef}
        className="relative z-10 max-w-2xl text-center text-3xl leading-tight font-light"
        style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
      >
        {section12.heading}
      </h2>
      <p ref={subheadingRef} className="relative z-10 mx-auto mt-5 max-w-md text-center text-sm font-light" style={{ color: colors.deepHemp }}>
        {section12.subheading}
      </p>
      <button
        ref={ctaRef}
        type="button"
        onClick={() => scrollToSection("section-11-product-family")}
        className="relative z-10 mt-8 rounded-full px-8 py-3 text-xs tracking-[0.2em] uppercase transition-transform hover:scale-105"
        style={{ backgroundColor: colors.deepHemp, color: colors.softIvory }}
      >
        {section12.cta}
      </button>
    </div>
  );
}
