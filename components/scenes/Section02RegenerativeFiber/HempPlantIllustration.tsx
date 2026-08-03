import { forwardRef } from "react";
import { colors } from "@/lib/theme";

type LeafClusterProps = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

// A single hemp leaflet outline — base at (0,0), tapering to a point at
// (0,-length), modeled on the reference photo (images/ss7kenevir.jpeg):
// narrower and longer than a generic leaf, widest ~40% up, with a fine
// even sawtooth margin running nearly the full length. Tooth count scales
// with blade length so short outer blades don't get overcrowded while the
// long center blade still reads as finely serrated.
function leafletPath(length: number) {
  const peakT = 0.4;
  const maxHalfWidth = length * 0.17;
  const teeth = Math.max(6, Math.round(length / 8));
  const toothDepth = 0.22;
  const steps = 48;

  function envelope(t: number) {
    if (t <= peakT) return maxHalfWidth * Math.pow(t / peakT, 0.55);
    return maxHalfWidth * Math.pow((1 - t) / (1 - peakT), 1.15);
  }
  function halfWidth(t: number) {
    const w = envelope(t);
    if (t < 0.05 || t > 0.96) return w;
    const phase = (t * teeth) % 1;
    const tooth = 1 - Math.abs(2 * phase - 1);
    return w * (1 - toothDepth * (1 - tooth));
  }

  const right: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    right.push([halfWidth(t), -t * length]);
  }
  const left: [number, number][] = [];
  for (let i = steps - 1; i >= 1; i--) {
    const t = i / steps;
    left.push([-halfWidth(t), -t * length]);
  }
  const points = [...right, ...left];
  return `M${points[0][0]},${points[0][1]} ${points
    .slice(1)
    .map(([px, py]) => `L${px.toFixed(2)},${py.toFixed(2)}`)
    .join(" ")} Z`;
}

// A 5-blade hemp leaf — a center blade plus two graduated side pairs,
// mirroring the reference photo's palmate fan (longest center blade,
// shorter and more outward-angled toward the edges), plus a faint midrib
// per blade for a touch of botanical realism without a full diagram.
function LeafCluster({ x, y, scale, rotate }: LeafClusterProps) {
  const blades = [
    { angle: -52, length: 42 },
    { angle: -26, length: 60 },
    { angle: 0, length: 78 },
    { angle: 26, length: 60 },
    { angle: 52, length: 42 },
  ];

  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      {blades.map((blade, i) => (
        <g key={i} transform={`rotate(${blade.angle})`}>
          <path
            d={leafletPath(blade.length)}
            fill={i % 2 === 0 ? colors.mutedHemp : colors.deepHemp}
            stroke={colors.deepHemp}
            strokeWidth="0.5"
            strokeOpacity="0.3"
            opacity={0.92}
          />
          <path d={`M0,0 L0,${-blade.length * 0.9}`} stroke={colors.deepHemp} strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
        </g>
      ))}
    </g>
  );
}

type Props = {
  rootsRef: React.Ref<SVGGElement>;
  stemRef: React.Ref<SVGPathElement>;
  leavesRef: React.Ref<SVGGElement>;
  fiberRef: React.Ref<SVGGElement>;
  sunRef: React.Ref<SVGCircleElement>;
};

export const HempPlantIllustration = forwardRef<SVGSVGElement, Props>(function HempPlantIllustration(
  { rootsRef, stemRef, leavesRef, fiberRef, sunRef },
  svgRef
) {
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 400 700"
      width={400}
      height={700}
      className="h-[50vh] w-auto max-w-none md:h-[56vh]"
      fill="none"
    >
      <circle ref={sunRef} cx="200" cy="270" r="150" fill={colors.mutedCycleRed} opacity="0.16" />

      <g ref={fiberRef}>
        <path d="M182 420 C 180 360 184 280 181 210 C 179 175 182 150 180 140" stroke={colors.mutedHemp} strokeWidth="1" opacity="0.5" />
        <path d="M192 420 C 191 360 193 280 192 210 C 191 175 192 150 191 140" stroke={colors.deepHemp} strokeWidth="1" opacity="0.5" />
        <path d="M208 420 C 209 360 207 280 208 210 C 209 175 208 150 209 140" stroke={colors.deepHemp} strokeWidth="1" opacity="0.5" />
        <path d="M218 420 C 220 360 216 280 219 210 C 221 175 218 150 220 140" stroke={colors.mutedHemp} strokeWidth="1" opacity="0.5" />
      </g>

      <path
        ref={stemRef}
        d="M200 420 C 198 360 202 280 199 210 C 197 175 200 150 200 130"
        stroke={colors.deepHemp}
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Four clusters total, hanging off the stem's left and right sides
          (rotate ±~110° points each cluster's "up" local axis out and
          slightly down, away from the stem) at two heights, rather than
          radiating symmetrically around a center point. */}
      <g ref={leavesRef}>
        <LeafCluster x={183} y={200} scale={1.3} rotate={-108} />
        <LeafCluster x={217} y={200} scale={1.3} rotate={108} />
        <LeafCluster x={186} y={300} scale={1.15} rotate={-100} />
        <LeafCluster x={214} y={300} scale={1.15} rotate={100} />
      </g>

      <g ref={rootsRef}>
        <path d="M200 420 C 190 460 170 470 150 510" stroke={colors.deepHemp} strokeWidth="2" strokeLinecap="round" />
        <path d="M200 420 C 205 465 195 480 198 525" stroke={colors.deepHemp} strokeWidth="2" strokeLinecap="round" />
        <path d="M200 420 C 210 460 230 470 250 508" stroke={colors.deepHemp} strokeWidth="2" strokeLinecap="round" />
        <path d="M200 420 C 195 455 180 458 172 495" stroke={colors.mutedHemp} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M200 420 C 206 455 222 460 230 494" stroke={colors.mutedHemp} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
});
