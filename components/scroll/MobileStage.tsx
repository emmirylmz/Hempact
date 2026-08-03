"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsapConfig";
import { useIsMobile } from "@/lib/useIsMobile";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { createBackgroundFlowEntry } from "@/lib/useSceneBackgroundFlow";

export type StageScene = {
  id: string;
  // Relative scroll-distance weight for this scene, copied straight from
  // whatever "+=NNN%" that section's own (now-superseded) mobile pin used
  // before it joined this stage — preserves each scene's already-tuned
  // pacing instead of splitting the run into equal slices.
  endPct: number;
  render: () => ReactNode;
  // Called on every scroll tick with this scene's own 0–1 progress
  // through *its own* window (not the run's overall progress) — video
  // scrub, caption timing, etc. all key off this exactly like they used
  // to key off `self.progress` from their own independent ScrollTrigger.
  onLocalProgress?: (localProgress: number) => void;
  // This scene's resting background color, same value its own (desktop)
  // `useSceneBackgroundFlow(ref, color)` call uses. Optional: omit for a
  // scene that doesn't drive the shared background layer.
  color?: string;
};

// Fraction of a scene's own window spent fading in/out at its edges. Two
// adjacent scenes' fade lanes reference *different* scenes' own windows
// (scene N's fade-out is the tail of N's window, scene N+1's fade-in is
// the head of N+1's window) — they're contiguous, never overlapping, so
// scene N always reaches opacity 0 before scene N+1 starts rising from 0.
// This is the "strictly sequential" requirement — unlike e.g. Section05's
// existing desktop caption crossfade, which deliberately keeps a shared
// ease-ramp overlap between adjacent captions.
const FADE_FRACTION = 0.05;

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// Stretches the physical scroll distance required to get through a whole
// run, without touching the `windows` ratios below (those are computed
// from the raw `endPct` sum, unaffected by this) — so every scene keeps
// its already-tuned relative pacing, the page just asks for more actual
// finger-scroll to move through the same content. Addresses "sayfayı
// aşağı kaydırma hızı biraz fazla hızlı" — a modest, easily-retuned
// single knob rather than re-tuning 10 scenes' individual `endPct`
// values across 3 files.
const SCROLL_SLOWDOWN = 1.2;

// Minimum change in localProgress before a scene's `onLocalProgress` (and
// its background-flow update) fires again. Every scene in a run gets
// re-evaluated on *every* scroll tick, including scenes fully outside
// their own window right now — those clamp to a constant 0 or 1 and,
// without this guard, would still re-invoke their (sometimes expensive:
// a plain video's currentTime seek, or Section03/10's full canvas
// chroma-key redraw) progress handler every single tick for no visible
// change at all. This was a real, confirmed contributor to the "videos
// feel like they're stuttering" report on real phones (see
// [[mobile_unified_stage_architecture]]) — during Run A, for instance,
// scrolling through Section01 alone was still re-running Section02-07's
// handlers every tick even though none of them had actually changed.
const PROGRESS_EPSILON = 0.0005;

// Runs ONE persistent pinned container for a whole contiguous run of
// scenes, instead of each scene independently pinning itself. Eliminates
// the class of bugs that comes from N separately-pinned boxes needing to
// hand off to each other cleanly (gaps, z-index races, staggered-creation
// timing) — see [[mobile_scroll_architecture]] for the incident history
// this replaces. Mobile-only: rendered unconditionally in the tree (CSS
// `md:hidden` gates visibility) so there's no isMobile-driven JSX branch
// to cause a hydration mismatch — same invariant lib/useIsMobile.ts's own
// comment documents — but the GSAP setup effect itself only runs when
// `isMobile` is true, so a desktop visit never creates this stage's
// ScrollTrigger at all.
export function MobileStage({
  id,
  scenes,
  className = "",
}: {
  id: string;
  scenes: StageScene[];
  // Extra classes for the stage's own container — in practice always a
  // z-[N] matching this run's own place in the sitewide descending
  // z-index scheme (see Section01FirstEncounter's own comment), so
  // whichever run is currently pinned outranks whatever normal-flow
  // section comes right after it (e.g. Section08 sitting between Run A
  // and Run B).
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scenesRef = useRef(scenes);
  // Kept fresh every render (see the effect below, which only re-runs on
  // isMobile/reducedMotion changes and reads this ref at that moment) —
  // must happen in an effect, not directly in the render body, per this
  // project's React Compiler lint rules (see
  // [[eslint_react_compiler_immutability]]).
  useEffect(() => {
    scenesRef.current = scenes;
  });

  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || reducedMotion || !isMobile) return;

    const currentScenes = scenesRef.current;
    const totalPct = currentScenes.reduce((sum, scene) => sum + scene.endPct, 0);
    let cumulative = 0;
    const windows = currentScenes.map((scene) => {
      const start = cumulative / totalPct;
      cumulative += scene.endPct;
      const end = cumulative / totalPct;
      return { start, end };
    });

    // Explicit initial state before the first scroll tick — only scene 0
    // starts visible, everything else starts hidden — so there's no flash
    // of every scene stacked at full opacity before onUpdate first runs.
    sceneRefs.current.forEach((el, index) => {
      if (!el) return;
      const visible = index === 0;
      gsap.set(el, {
        opacity: visible ? 1 : 0,
        visibility: visible ? "visible" : "hidden",
        pointerEvents: visible ? "auto" : "none",
      });
    });

    // Each colored scene gets its own entry in the shared background-flow
    // registry (see lib/useSceneBackgroundFlow.ts) — driven imperatively
    // from this stage's own onUpdate below instead of an independent
    // per-section ScrollTrigger, since every scene here shares the same
    // `absolute inset-0` rect and couldn't measure its own distinct
    // "top center"/"bottom center" position the way a normal-flow
    // section can.
    const bgEntries = currentScenes.map((scene, index) => {
      const el = sceneRefs.current[index];
      return scene.color && el ? createBackgroundFlowEntry(el, scene.color) : null;
    });

    // Effect-scoped, not a React ref — lives and dies with this trigger,
    // same as `bgEntries`/`windows` above. Seeded to -1 so every scene's
    // very first tick always counts as "changed" regardless of its actual
    // starting value.
    const lastProgress = new Array(currentScenes.length).fill(-1);

    const trigger = ScrollTrigger.create({
      trigger: container,
      start: "top top",
      end: `+=${totalPct * SCROLL_SLOWDOWN}%`,
      pin: true,
      pinSpacing: true,
      // 0.3 -> 0.45: a bit more inertia/smoothing on fast flicks, so the
      // video scrub and cross-fades don't chase abrupt, jarring jumps —
      // part of the same "videos feel like they're stuttering" fix as the
      // per-scene skip-if-unchanged guard below.
      scrub: 0.45,
      onUpdate: (self) => {
        const runProgress = self.progress;

        currentScenes.forEach((scene, index) => {
          const { start, end } = windows[index];
          const span = end - start || 1;
          const localProgress = clamp01((runProgress - start) / span);

          // The first scene has no predecessor to fade in from (its own
          // fade-in lane would otherwise start it at opacity 0 the moment
          // this trigger's very first onUpdate fires, at/near
          // runProgress===0 — GSAP can fire that first pass synchronously
          // during pin setup, before any real scroll has happened) — and
          // the last scene has no successor to fade out to. `index > 0`/
          // `index < length-1` guards are used here instead of comparing
          // `runProgress` against `start`/`end` directly, since that
          // comparison is exact-equality-sensitive and was observed to
          // leave scene 0 stuck at opacity 0 on initial load.
          let opacity = 1;
          if (index > 0 && localProgress < FADE_FRACTION) {
            opacity = smoothstep(localProgress / FADE_FRACTION);
          } else if (index < currentScenes.length - 1 && localProgress > 1 - FADE_FRACTION) {
            opacity = smoothstep((1 - localProgress) / FADE_FRACTION);
          }

          const el = sceneRefs.current[index];
          if (el) {
            gsap.set(el, {
              opacity,
              visibility: opacity > 0 ? "visible" : "hidden",
              pointerEvents: localProgress > 0 && localProgress < 1 ? "auto" : "none",
            });
          }

          // Skip the scene's own progress handler (video currentTime
          // seek, or Section03/10's costlier canvas chroma-key redraw)
          // and the background-flow blend entirely when this scene's
          // *own* progress hasn't materially moved — true for every scene
          // outside its active window on most ticks, see this file's own
          // `PROGRESS_EPSILON` comment above.
          if (Math.abs(localProgress - lastProgress[index]) > PROGRESS_EPSILON) {
            lastProgress[index] = localProgress;
            scene.onLocalProgress?.(localProgress);
            bgEntries[index]?.setProgress(localProgress);
          }
        });
      },
    });

    return () => {
      trigger.kill();
      bgEntries.forEach((entry) => entry?.destroy());
    };
  }, [reducedMotion, isMobile]);

  return (
    <div id={id} ref={containerRef} className={`relative w-full min-h-dvh overflow-hidden md:hidden ${className}`}>
      {scenes.map((scene, index) => (
        <div
          key={scene.id}
          ref={(el) => {
            sceneRefs.current[index] = el;
          }}
          className="absolute inset-0"
          // Mirrors the effect's own initial gsap.set() below, but baked
          // into the server-rendered markup itself — the effect only runs
          // post-hydration, so without this, the very first paint (and
          // anyone with reduced motion, whose effect bails out before ever
          // setting this) would show every scene's text stacked at full
          // opacity on top of each other.
          style={{
            opacity: index === 0 ? 1 : 0,
            visibility: index === 0 ? "visible" : "hidden",
            pointerEvents: index === 0 ? "auto" : "none",
          }}
        >
          {scene.render()}
        </div>
      ))}
    </div>
  );
}
