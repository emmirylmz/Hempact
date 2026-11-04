import type { CSSProperties } from "react";
import { colors } from "@/lib/theme";

// Used by both the desktop hero (Section01FirstEncounter) and the mobile
// hero (MobileScene01) — any change here must look the same in both.
//
// Cost pass (bulgu #10, docs/scroll-performans-raporu.md): this layer used
// to be a full-screen `filter: blur(70px)` sweep + a `mix-blend-mode:
// overlay` feTurbulence grain. Both are gone; what's on screen is kept:
//
// - Sweep: blurring a linear ramp leaves the ramp itself unchanged (a
//   symmetric kernel preserves linear functions) — the blur only ever acted
//   at the box's own edges, which sit 15% outside the section. On desktop
//   that's ≥115px ≈ 1.6σ+ away, invisible; on phones it let ~20% of the
//   page background (mistSage under this scene) show at the left/right
//   screen edges. `.tri-tone-edge` (app/globals.css) reproduces that
//   falloff statically on mobile.
// - Grain: a 4.5%-opacity overlay of ~50%-alpha grey noise changes a pixel
//   by roughly ±1/255 — below what an 8-bit display can show, while
//   `mix-blend-mode` forced an extra isolated compositing pass over the
//   whole hero. Removed.
//
// The edge colour stops follow 1 − Φ((x + 0.15·390px) / 70px):
// .20 at 0px, .12 at 25px, .06 at 50px, .012 at 100px, 0 by 140px.
const EDGE_STOPS = `${colors.mistSage}33 0px, ${colors.mistSage}1f 25px, ${colors.mistSage}0f 50px, ${colors.mistSage}03 100px, transparent 140px`;
const EDGE_STOPS_RIGHT = `transparent calc(100% - 140px), ${colors.mistSage}03 calc(100% - 100px), ${colors.mistSage}0f calc(100% - 50px), ${colors.mistSage}1f calc(100% - 25px), ${colors.mistSage}33 100%`;

export function TriToneBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Left-to-right light→dark green sweep — matches the same two
          endpoints (paleHemp, deepHemp) baked into hero-plant-growth.mp4's
          own background, so the video's edges have nothing to seam
          against (see Section01FirstEncounter.tsx / theme.ts mistSage).
          The -15% inset is kept so the ramp's slope/position on screen is
          identical to the old blurred version. */}
      <div
        className="absolute -inset-[15%]"
        style={{ background: `linear-gradient(90deg, ${colors.paleHemp} 0%, ${colors.deepHemp} 100%)` }}
      />
      <div
        className="tri-tone-edge absolute inset-0"
        style={{ "--tri-tone-edge": `linear-gradient(90deg, ${EDGE_STOPS}, ${EDGE_STOPS_RIGHT})` } as CSSProperties}
      />
      {/* A warm halo where the product sits, so it reads as lit rather than pasted on */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(closest-side, ${colors.softIvory}cc, transparent 65%)`,
        }}
      />
    </div>
  );
}
