"use client";

import { useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useChromaKeyVideo } from "@/lib/useChromaKeyVideo";
import { MOBILE_SOURCE_MEDIA } from "@/lib/mobileMedia";

// section3.mp4's own flat backdrop, sampled directly from the file (mode
// color across 10 frames via ffmpeg+sharp — see MobileScene02.tsx's own
// comment on why this is measured, not assumed from theme.ts). Verified
// via histogram: dense cluster at distance 0, near-zero pixels between
// 30-140, real content (the plant's stem/leaves) starting at 140+ — a
// safe gap for the shared hook's default 12/10 threshold/feather. Note:
// naively sampling only the frame corners for this clip gives a wrong
// answer, since the plant's own leaves extend into the corners at some
// points in the footage — the mode across the whole clip is what's
// actually reliable.
const KEY: [number, number, number] = [248, 244, 240];

// Pre-blurred halo (Faz 2 / P2, bulgu #10): the old
// `radial-gradient(ellipse, deepHemp35, transparent 70%)` + `blur(40px)`
// layer, sampled from Chromium's own blurred render at 390px into plain
// gradient stops (deepHemp = rgb(64,85,72)). Measured against the original:
// max 3.0/255, mean 0.24/255 per channel.
const HALO_03 =
  "radial-gradient(ellipse 35.9% 33.6% at 50% 50%, rgba(64,85,72,0.118) 0%, rgba(64,85,72,0.118) 5.6%, rgba(64,85,72,0.114) 11.1%, rgba(64,85,72,0.11) 16.7%, rgba(64,85,72,0.102) 22.2%, rgba(64,85,72,0.094) 27.8%, rgba(64,85,72,0.086) 33.3%, rgba(64,85,72,0.075) 38.9%, rgba(64,85,72,0.063) 44.4%, rgba(64,85,72,0.055) 50%, rgba(64,85,72,0.047) 55.6%, rgba(64,85,72,0.035) 61.1%, rgba(64,85,72,0.027) 66.7%, rgba(64,85,72,0.02) 72.2%, rgba(64,85,72,0.012) 77.8%, rgba(64,85,72,0.008) 83.3%, rgba(64,85,72,0.004) 88.9%, rgba(64,85,72,0.004) 94.4%, transparent 100%)";

// Mobile-only rendering of Section03, hosted inside MobileStageRunA — see
// MobileScene02.tsx's own comment, same pattern exactly (genuine canvas
// chroma-key transparency, not a mask or plain colorkey-only video).
export function MobileScene03({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { section03 } = useContent();

  // Lazy <source>, deferred iOS priming, and the pre-keyed alpha poster
  // drawn into the canvas until the first real frame: see
  // lib/useChromaKeyVideo.ts + lib/mobileMedia.ts.
  const media = useChromaKeyVideo("03", videoRef, canvasRef, onProgressRef, KEY);

  return (
    // pt-28 + [justify-content:safe_center]: see MobileScene01.tsx's own
    // comment on this pattern (was pt-16, less than the header's ~72px).
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden px-6 pt-28 pb-8 [justify-content:safe_center]">
      <div className="relative z-10 mb-6 max-w-xl text-center">
        <h2
          className="text-3xl leading-tight font-light"
          style={{ color: colors.charcoal, fontFamily: "var(--font-display)" }}
        >
          {section03.heading}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm font-light" style={{ color: colors.deepHemp }}>
          {section03.subheading}
        </p>
      </div>

      <div className="relative z-10 flex w-full flex-1 items-center justify-center">
        <div className="relative w-full max-w-xl">
          {/* Was radial-gradient(ellipse, deepHemp35, transparent 70%) +
              filter: blur(40px); now the pre-blurred result, see HALO_03's
              comment (box extended by 3σ = 120px). */}
          <div
            className="pointer-events-none absolute -z-10 scale-150"
            style={{ inset: "-120px", background: HALO_03 }}
            aria-hidden
          />
          <div className="relative w-full" style={{ aspectRatio: "1280 / 720" }}>
            {/* Hidden — decode/draw source for the visible canvas below
                only. See MobileScene02.tsx's own comment. `<source media>`
                instead of a plain `src`: `opacity-0` hides this visually
                but does nothing to stop the browser from eagerly fetching
                a `src` it finds in the raw markup — this file still needs
                its own gating, same as every other MobileSceneNN.tsx. */}
            <video
              ref={videoRef}
              muted
              playsInline
              preload={media.preload}
              aria-hidden
              className="absolute inset-0 h-full w-full object-contain opacity-0"
            >
              {media.attached && <source src={media.src} type="video/mp4" media={MOBILE_SOURCE_MEDIA} />}
            </video>
            <canvas
              ref={canvasRef}
              aria-hidden
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
