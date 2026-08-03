import { forwardRef } from "react";
import { colors } from "@/lib/theme";

const DOT_COUNT = 9;
// CENTER anchors the *video* (VIDEO_RECT below) — kept separate from
// NETWORK_CENTER so repositioning the dot network on its own never drags
// the footage along with it.
const CENTER = { x: 300, y: 230 };

// The video's own footprint, in the same 600x400 viewBox the dot network
// is built against — sized/centered so the network still visually
// "surrounds" the figures in it. Anchored by center (not top), so
// resizing keeps the same point of the illustration lined up with the
// network regardless of scale. These dimensions carry over unchanged from
// the previous static k1.png (same footprint, kadins.mp4 just plays
// inside it now instead of a single frozen frame).
const FIGURES_WIDTH = 340;
const FIGURES_ASPECT = 2694 / 1568;
const FIGURES_HEIGHT = FIGURES_WIDTH / FIGURES_ASPECT;
// The video's own vertical midpoint (FIGURES_Y below is derived as
// FIGURES_CENTER_Y - FIGURES_HEIGHT/2, so this *is* the 50% line by
// construction).
const FIGURES_CENTER_Y = 260;
const FIGURES_X = CENTER.x - FIGURES_WIDTH / 2;
const FIGURES_Y = FIGURES_CENTER_Y - FIGURES_HEIGHT / 2;

// The cropped viewBox this SVG renders (see the comment on the <svg>
// element below for why it's cropped from the original 0 0 600 400).
const VIEWBOX = { x: 0, y: 140, width: 600, height: 240 };

// kadins.mp4 no longer lives inside this SVG (embedding <video> via
// foreignObject is an unreliable cross-browser path, the same class of
// problem masking a <video> directly caused elsewhere on this site — see
// [[section05_video_mask_on_video_element_bug]]). Instead it's a plain
// HTML <video> sibling in Section10SocialImpact.tsx, positioned via these
// percentages (derived from the same FIGURES_*/VIEWBOX geometry above, not
// hand-picked) so it lines up exactly with where this SVG's dot network
// still expects the figures to be.
export const VIDEO_RECT = {
  leftPct: (FIGURES_X / VIEWBOX.width) * 100,
  topPct: ((FIGURES_Y - VIEWBOX.y) / VIEWBOX.height) * 100,
  widthPct: (FIGURES_WIDTH / VIEWBOX.width) * 100,
  heightPct: (FIGURES_HEIGHT / VIEWBOX.height) * 100,
};

// The dot network's own center — sits on the figures' own 50% vertical
// line (FIGURES_CENTER_Y), independent of CENTER (the video's horizontal
// anchor).
const NETWORK_CENTER = { x: CENTER.x, y: FIGURES_CENTER_Y };
const RADIUS = 84.375;

export function dotPoint(index: number) {
  const angle = (index / DOT_COUNT) * Math.PI * 2 - Math.PI / 2;
  return {
    x: NETWORK_CENTER.x + RADIUS * Math.cos(angle) * 1.3,
    y: NETWORK_CENTER.y + RADIUS * Math.sin(angle) * 0.6,
  };
}

type Props = {
  firstDotRef: React.Ref<SVGCircleElement>;
  dotsRef: React.Ref<SVGGElement>;
  linesRef: React.Ref<SVGGElement>;
};

// Purely the dot-network overlay now — no <image>/<video> inside this SVG
// at all, see VIDEO_RECT above. Sits absolutely positioned over the video
// in Section10SocialImpact.tsx, sized to match it exactly (h-full w-full),
// so its own viewBox coordinate system continues to line up with the
// video the same way it lined up with the old static image.
export const ImpactIllustration = forwardRef<SVGSVGElement, Props>(function ImpactIllustration(
  { firstDotRef, dotsRef, linesRef },
  svgRef
) {
  const dots = Array.from({ length: DOT_COUNT }, (_, i) => dotPoint(i));

  return (
    <svg
      ref={svgRef}
      viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}`}
      className="absolute inset-0 h-full w-full"
      fill="none"
    >
      <g ref={linesRef}>
        {dots.map((p, i) => {
          const next = dots[(i + 1) % dots.length];
          return (
            <line key={i} x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke={colors.mutedCycleRed} strokeWidth="1" opacity="0.4" />
          );
        })}
      </g>

      <g ref={dotsRef}>
        {dots.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="6.19" fill={colors.mutedCycleRed} opacity="0.16" />
            <circle cx={p.x} cy={p.y} r="3.375" fill={colors.mutedCycleRed} />
          </g>
        ))}
      </g>

      <circle cx={NETWORK_CENTER.x} cy={NETWORK_CENTER.y} r="9" fill={colors.mutedCycleRed} opacity="0.18" />
      <circle ref={firstDotRef} cx={NETWORK_CENTER.x} cy={NETWORK_CENTER.y} r="5.0625" fill={colors.mutedCycleRed} />
    </svg>
  );
});
