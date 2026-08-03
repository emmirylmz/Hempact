import { colors } from "@/lib/theme";

// A subtle grain so the wide color field reads as soft diffused light rather
// than a flat digital gradient.
const GRAIN_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
      <filter id='n'>
        <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch' />
        <feColorMatrix type='saturate' values='0' />
      </filter>
      <rect width='100%' height='100%' filter='url(#n)' />
    </svg>`
  );

export function TriToneBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Left-to-right light→dark green sweep — matches the same two
          endpoints (paleHemp, deepHemp) baked into hero-plant-growth.mp4's
          own background, so the video's edges have nothing to seam
          against (see Section01FirstEncounter.tsx / theme.ts mistSage). */}
      <div
        className="absolute -inset-[15%]"
        style={{
          background: `linear-gradient(90deg, ${colors.paleHemp} 0%, ${colors.deepHemp} 100%)`,
          filter: "blur(70px)",
        }}
      />
      {/* A warm halo where the product sits, so it reads as lit rather than pasted on */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(closest-side, ${colors.softIvory}cc, transparent 65%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${GRAIN_SVG}")`,
          opacity: 0.045,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
