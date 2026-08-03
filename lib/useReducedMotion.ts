"use client";

// Intentionally always `false` — the OS/browser `prefers-reduced-motion`
// setting is not respected here by product decision (the scroll-driven
// video/animation experience is the site's core content, not a decorative
// extra), even though most of the codebase's reduced-motion branches were
// originally built to honor it. Every call site still receives a boolean
// from this same hook shape, so nothing else needed to change.
export function useReducedMotion(): boolean {
  return false;
}
