import { forwardRef } from "react";
import { colors } from "@/lib/theme";

const CENTER_X = 340;
const CENTER_Y = 380;
const BARK_R = 180;
const BAST_R = 142;
const CORE_R = 72;

// Exported so useSection03Timeline can measure exactly where the entry
// stem's own line (below) lands on screen, and align the cross-section
// stem-extension connector to it pixel-for-pixel rather than guessing.
export const STEM_VIEWBOX = { width: 800, height: 700 };
export const STEM_ENTRY = { x: CENTER_X, y: 100 };
export const STEM_STROKE_WIDTH = 7;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

type Props = {
  stemRef: React.Ref<SVGLineElement>;
  cutLineRef: React.Ref<SVGLineElement>;
  ringsRef: React.Ref<SVGGElement>;
  bastRef: React.Ref<SVGGElement>;
  fibersRef: React.Ref<SVGGElement>;
};

export const StemCrossSectionIllustration = forwardRef<SVGSVGElement, Props>(
  function StemCrossSectionIllustration({ stemRef, cutLineRef, ringsRef, bastRef, fibersRef }, svgRef) {
    const bastBundles = Array.from({ length: 16 }, (_, i) => (360 / 16) * i);
    const fiberAngles = [-24, -6, 14, 34];

    return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${STEM_VIEWBOX.width} ${STEM_VIEWBOX.height}`}
        width={STEM_VIEWBOX.width}
        height={STEM_VIEWBOX.height}
        className="h-[50dvh] w-auto max-w-none md:h-[58dvh]"
        fill="none"
      >
        {/* Entry state: the stem, continuing straight from the previous chapter
            (see STEM_ENTRY — useSection03Timeline measures this exact point
            to align the cross-section stem-extension connector to it). */}
        <line
          ref={stemRef}
          x1={STEM_ENTRY.x}
          y1={STEM_ENTRY.y}
          x2={CENTER_X}
          y2="680"
          stroke={colors.deepHemp}
          strokeWidth={STEM_STROKE_WIDTH}
          strokeLinecap="round"
        />

        {/* The cut */}
        <line
          ref={cutLineRef}
          x1={CENTER_X - 90}
          y1={CENTER_Y}
          x2={CENTER_X + 90}
          y2={CENTER_Y}
          stroke={colors.mutedCycleRed}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Cross-section */}
        <g ref={ringsRef}>
          <circle cx={CENTER_X} cy={CENTER_Y} r={BARK_R} fill={colors.softIvory} stroke={colors.deepHemp} strokeWidth="3" />
          <circle cx={CENTER_X} cy={CENTER_Y} r={BARK_R - 26} fill="none" stroke={colors.deepHemp} strokeWidth="1" opacity="0.25" />
          <circle cx={CENTER_X} cy={CENTER_Y} r={BAST_R - 10} fill="none" stroke={colors.deepHemp} strokeWidth="1" opacity="0.2" />

          <g ref={bastRef}>
            {bastBundles.map((deg) => {
              const p = polar(CENTER_X, CENTER_Y, BAST_R, deg);
              return (
                <ellipse
                  key={deg}
                  cx={p.x}
                  cy={p.y}
                  rx="7"
                  ry="14"
                  fill={colors.mutedHemp}
                  transform={`rotate(${deg + 90} ${p.x} ${p.y})`}
                />
              );
            })}
          </g>

          <circle cx={CENTER_X} cy={CENTER_Y} r={CORE_R} fill={colors.warmLinen} stroke={colors.deepHemp} strokeWidth="1.5" opacity="0.9" />
          {[0, 45, 90, 135].map((deg) => {
            const p1 = polar(CENTER_X, CENTER_Y, CORE_R - 10, deg);
            const p2 = polar(CENTER_X, CENTER_Y, CORE_R - 10, deg + 180);
            return (
              <line
                key={deg}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={colors.deepHemp}
                strokeWidth="1"
                opacity="0.2"
              />
            );
          })}
        </g>

        {/* Fibers pulled out to the right, softening into ribbons */}
        <g ref={fibersRef}>
          {fiberAngles.map((deg, i) => {
            const start = polar(CENTER_X, CENTER_Y, BAST_R, deg);
            const endY = CENTER_Y + deg * 2.2;
            return (
              <path
                key={deg}
                d={`M${start.x},${start.y} C ${start.x + 160},${start.y} ${start.x + 260},${endY} 760,${endY}`}
                stroke={i % 2 === 0 ? colors.mutedHemp : colors.deepHemp}
                strokeWidth={5 - i * 0.4}
                strokeLinecap="round"
              />
            );
          })}
        </g>
      </svg>
    );
  }
);
