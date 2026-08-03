import { forwardRef } from "react";
import { colors } from "@/lib/theme";

const CENTER = 200;
const R = 150;

export function stagePoint(index: number, count: number, radius: number = R) {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

type Props = {
  markerRef: React.Ref<SVGCircleElement>;
  trailRef: React.Ref<SVGCircleElement>;
  stageCount: number;
};

export const CycleIllustration = forwardRef<SVGSVGElement, Props>(function CycleIllustration(
  { markerRef, trailRef, stageCount },
  svgRef
) {
  const circumference = 2 * Math.PI * R;

  return (
    <svg ref={svgRef} viewBox="0 0 400 400" width={400} height={400} className="h-[40dvh] w-auto max-w-none md:h-[46dvh]" fill="none">
      <defs>
        <radialGradient id="soil-core" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={colors.deepHemp} stopOpacity="0.35" />
          <stop offset="100%" stopColor={colors.deepHemp} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={CENTER} cy={CENTER} r={R - 30} fill="url(#soil-core)" />
      <circle cx={CENTER} cy={CENTER} r={R} stroke={colors.deepHemp} strokeWidth="1.5" opacity="0.3" />

      {/* the arc already travelled, trailing the marker */}
      <circle
        ref={trailRef}
        cx={CENTER}
        cy={CENTER}
        r={R}
        stroke={colors.mutedCycleRed}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference}
        opacity="0.45"
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
      />

      {Array.from({ length: stageCount }, (_, i) => {
        const p = stagePoint(i, stageCount);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="12" fill={colors.mutedHemp} opacity="0.18" />
            <circle cx={p.x} cy={p.y} r="6" fill={colors.mutedHemp} />
          </g>
        );
      })}

      <circle cx={CENTER} cy={CENTER - R} r="16" fill={colors.mutedCycleRed} opacity="0.2" />
      <circle ref={markerRef} cx={CENTER} cy={CENTER - R} r="9" fill={colors.mutedCycleRed} />
    </svg>
  );
});
