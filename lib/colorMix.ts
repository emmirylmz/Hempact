// Perceptually smoother color interpolation for the page's scroll-driven
// background flow (see useSceneBackgroundFlow.ts). Plain RGB interpolation
// (what a naive gsap.to({ backgroundColor }) tween does) drags straight
// through a desaturated grey/brown "mud" zone whenever the two colors sit
// in different hue families — e.g. paleHemp's green and warmTaupe's brown
// average to a flat, lifeless tan at the midpoint. Mixing in HSL space and
// walking the *shorter* path around the hue wheel avoids that dead zone and
// keeps the transition reading as "one hue sliding into another" instead of
// "fading through grey."
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hn = h / 360;
  const r = hue2rgb(p, q, hn + 1 / 3);
  const g = hue2rgb(p, q, hn);
  const b = hue2rgb(p, q, hn - 1 / 3);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/** Mixes two "#rrggbb" colors in HSL space, walking the shorter hue path. `t` is clamped to [0, 1]. */
export function mixColorsHsl(colorA: string, colorB: string, t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  if (clamped === 0) return colorA;
  if (clamped === 1) return colorB;

  const [h1, s1, l1] = rgbToHsl(...hexToRgb(colorA));
  const [h2, s2, l2] = rgbToHsl(...hexToRgb(colorB));

  let dh = h2 - h1;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const h = (h1 + dh * clamped + 360) % 360;
  const s = s1 + (s2 - s1) * clamped;
  const l = l1 + (l2 - l1) * clamped;

  const [r, g, b] = hslToRgb(h, s, l);
  return `rgb(${r}, ${g}, ${b})`;
}
