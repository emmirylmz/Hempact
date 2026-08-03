// Palette sourced from READ.md — the site's canonical color system.
// Usage ratio guidance from the brief: beige ~55%, green ~30%, red ~15%.
export const colors = {
  warmLinen: "#F3EFE6", // primary background
  softIvory: "#FAF8F2", // secondary background

  mutedHemp: "#8FA282", // primary green
  deepHemp: "#405548", // dark green
  paleHemp: "#DCE3D2", // pale sage — a green-leaning background, used to give green more presence

  mutedCycleRed: "#A96260", // primary red — used sparingly, never a bright "blood" red
  softClayRose: "#D5AAA3", // light red

  warmTaupe: "#C7B6A8", // sampled from pedlayers.mp4's own background — used to bridge the footage's edges into the page instead of a contrasting stage color
  studioGray: "#B5B4B9", // ped1.mp4's own studio background tone (cool light gray, not warm) — Section05's page background matches this directly, static (no per-frame changes) so the footage's mask-feathered edges disappear into it entirely
  mistSage: "#B6BEB0", // originally sampled from hero-plant-growth.mp4's flat background before it became a paleHemp→deepHemp gradient — kept as Section01's representative mid-tone for the cross-section background handoff

  charcoal: "#2C302C", // text
} as const;

export type ColorToken = keyof typeof colors;
