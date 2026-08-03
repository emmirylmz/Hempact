"use client";

import { useRef, type RefObject } from "react";
import { useContent } from "@/lib/i18n/LocaleContext";
import { colors } from "@/lib/theme";
import { useChromaKeyVideo } from "@/lib/useChromaKeyVideo";

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

// Mobile-only rendering of Section03, hosted inside MobileStageRunA — see
// MobileScene02.tsx's own comment, same pattern exactly (genuine canvas
// chroma-key transparency, not a mask or plain colorkey-only video).
export function MobileScene03({ onProgressRef }: { onProgressRef: RefObject<((localProgress: number) => void) | null> }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { section03 } = useContent();

  useChromaKeyVideo(videoRef, canvasRef, onProgressRef, KEY);

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
          <div
            className="pointer-events-none absolute inset-0 -z-10 scale-150"
            style={{
              background: `radial-gradient(ellipse, ${colors.deepHemp}35, transparent 70%)`,
              filter: "blur(40px)",
            }}
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
              preload="auto"
              aria-hidden
              className="absolute inset-0 h-full w-full object-contain opacity-0"
            >
              <source src="/images/section3.mp4" media="(max-width: 767.98px)" />
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
