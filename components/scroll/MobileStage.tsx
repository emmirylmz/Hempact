"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { ScrollTrigger } from "@/lib/gsapConfig";
import { useIsMobile } from "@/lib/useIsMobile";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { createBackgroundFlowEntry } from "@/lib/useSceneBackgroundFlow";
import { registerMobileRun, whenIdle } from "@/lib/mobileMedia";
import { scheduleIdle } from "@/lib/idleGsap";

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

// Faz 2 / QC2 O1 + QC3 — keeps the not-yet-shown scenes out of rendering
// (`content-visibility: hidden`, on top of the opacity/visibility fade)
// ONLY until the reader's first input. Reason: Chrome reports a video's
// first frame as the Largest Contentful Paint even when an ancestor is
// `opacity:0; visibility:hidden` (reproduced in isolation: H1 16.8k px² vs
// hidden video 66k px² → video wins), so the hidden S02 video became the
// mobile LCP element. Chrome finalises LCP at the first input, so after
// that hiding buys nothing — and toggling it *during* scrolling (QC2's
// version) cost a 56-62 ms forced layout inside the next scroll event
// (QC3). Now:
// - before the first input: scene 0 rendered, the rest hidden;
// - after it: the hidden scenes are switched back one per idle callback,
//   nearest first, with the layout forced inside that same idle task, and
//   never hidden again — the steady state is exactly the pre-P2 one;
// - safety net: a scene still hidden when the run reaches REVEAL_LEAD of
//   its neighbour's window before its own fade lane is revealed on the next
//   frame (only possible if no input came, or idle time never came), and
//   that also starts the idle chain; its style/layout is done long before
//   its opacity first rises above 0. The cross-fade itself is untouched.
const REVEAL_LEAD = 0.25;

let userEngaged = false;
const engagementListeners = new Set<() => void>();
function onEngagement(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (userEngaged) {
    callback();
    return () => {};
  }
  if (!engagementListeners.size) {
    const engage = () => {
      if (userEngaged) return;
      userEngaged = true;
      ENGAGE_EVENTS.forEach((type) => window.removeEventListener(type, engage));
      engagementListeners.forEach((listener) => listener());
      engagementListeners.clear();
    };
    ENGAGE_EVENTS.forEach((type) => window.addEventListener(type, engage, { passive: true }));
  }
  engagementListeners.add(callback);
  return () => {
    engagementListeners.delete(callback);
  };
}
const ENGAGE_EVENTS = ["touchstart", "pointerdown", "keydown", "wheel"] as const;

// Early-scroll jump fix: until this run's pin exists (it is created in a
// passive effect after hydration: 0.6-1.5 s at 4x CPU), the server-rendered
// page used to be only ~5.6k px tall on a 390x844 phone instead of 30.7k,
// and the stage scrolled away like a normal block. A reader who started
// flicking during hydration scrolled into Section08/11 content, then the pin
// appeared and the page grew under them (measured: content swap at
// y = 602 the moment the pin was created). With this attribute on the
// server-rendered spacer, globals.css gives it the pin's own geometry
// before any JS: its height = stage + pin distance (`end: +=N%` is N% of
// ScrollTrigger's 100vh measure, times SCROLL_SLOWDOWN) and a sticky stage,
// i.e. the stage holds still for exactly the scroll range the pin will
// hold it. The page has its final height from the first paint and the pin
// takes over in place. Mobile width only (same media query as md:hidden);
// the effect hands it over to the pin in the task that creates it.
const PRESIZE_ATTR = "data-run-presize";

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
  deferSetup,
}: {
  id: string;
  scenes: StageScene[];
  // See the effect: build this run's pin in the next task ("task") or in
  // idle time ("idle") instead of inside the hydration commit.
  deferSetup?: "task" | "idle";
  // Extra classes for the stage's own container — in practice always a
  // z-[N] matching this run's own place in the sitewide descending
  // z-index scheme (see Section01FirstEncounter's own comment), so
  // whichever run is currently pinned outranks whatever normal-flow
  // section comes right after it (e.g. Section08 sitting between Run A
  // and Run B).
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
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
    const spacer = spacerRef.current;
    if (!container || !spacer) return;
    if (reducedMotion || !isMobile) {
      // No pin at all on this path: drop the server-rendered pre-pin
      // geometry (see PRESIZE_ATTR) so nothing keeps the run's length.
      spacer.removeAttribute(PRESIZE_ATTR);
      return;
    }

    // Builds the pin, scene windows and media registration; returns cleanup.
    const setup = () => {
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
      // Plain style writes, only when a value changes (was gsap.set() for every
      // scene on every scroll tick: a new zero-duration tween per scene per
      // tick, plus GSAP's first-use CSS parsing inside the hydration commit).
      // Same values GSAP wrote: opacity rounded to 4 decimals, as its CSS
      // renderer does.
      const written = currentScenes.map(() => ({ opacity: "", visibility: "", pointerEvents: "" }));
      const writeScene = (index: number, opacity: number, visibility: string, pointerEvents: string) => {
        const el = sceneRefs.current[index];
        if (!el) return;
        const last = written[index];
        const opacityValue = String(Math.round(opacity * 10000) / 10000);
        if (last.opacity !== opacityValue) el.style.opacity = last.opacity = opacityValue;
        if (last.visibility !== visibility) el.style.visibility = last.visibility = visibility;
        if (last.pointerEvents !== pointerEvents) el.style.pointerEvents = last.pointerEvents = pointerEvents;
      };
      sceneRefs.current.forEach((el, index) => {
        if (!el) return;
        const visible = index === 0;
        writeScene(index, visible ? 1 : 0, visible ? "visible" : "hidden", visible ? "auto" : "none");
        el.style.contentVisibility = visible || userEngaged ? "visible" : "hidden";
      });

      // Safety-net range per scene (see REVEAL_LEAD): its own window, widened
      // by REVEAL_LEAD of each neighbour's window on that side.
      const renderRanges = windows.map(({ start, end }, index) => {
        const prev = windows[index - 1];
        const next = windows[index + 1];
        return {
          from: prev ? start - REVEAL_LEAD * (prev.end - prev.start) : -Infinity,
          to: next ? end + REVEAL_LEAD * (next.end - next.start) : Infinity,
        };
      });
      const rendered = currentScenes.map((_, index) => index === 0 || userEngaged);
      let lastRunProgress = 0;
      let disposed = false;

      const reveal = (index: number) => {
        const el = sceneRefs.current[index];
        if (!el || rendered[index]) return;
        rendered[index] = true;
        el.style.contentVisibility = "visible";
      };
      // QC4 Q4-2: the safety net fires inside ScrollTrigger's scroll listener
      // (onUpdate runs synchronously there) and the next scroll listener
      // (lib/mobileMedia.ts) reads scrollY, so a reveal written there could
      // be laid out synchronously inside the scroll event. A scene still at
      // opacity 0 is therefore revealed on the next animation frame (write
      // only; laid out in that frame's own rendering step). A scene already
      // visible this tick (a jump straight into it) is revealed at once, so
      // it is never painted empty.
      // The measured 90-118 ms task at S04 (no-input scrolling) was a
      // different read: S05's video attaches while the reader is in S04 and
      // its `loadedmetadata` re-applies progress (useMobileScrub), whose first
      // gsap.set on the captions parses their transform (getComputedStyle),
      // forcing a layout of S05's still `content-visibility: hidden` subtree.
      // What fixes that here is starting the idle chain below from the safety
      // net too, so S05 is already rendered when its metadata arrives.
      const pendingReveal = new Set<number>();
      let revealFrame = 0;
      const revealNextFrame = (index: number) => {
        if (rendered[index]) return;
        pendingReveal.add(index);
        if (revealFrame) return;
        revealFrame = requestAnimationFrame(() => {
          revealFrame = 0;
          pendingReveal.forEach(reveal);
          pendingReveal.clear();
        });
      };
      // After the first input: one hidden scene per idle callback, nearest
      // to the current run position first; the forced read pays the newly
      // shown subtree's style/layout here, in idle time, not in a scroll
      // event later.
      const revealNextIdle = () => {
        if (disposed) return;
        let best = -1;
        let bestDistance = Infinity;
        windows.forEach(({ start, end }, index) => {
          if (rendered[index]) return;
          const distance = lastRunProgress < start ? start - lastRunProgress : Math.max(0, lastRunProgress - end);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = index;
          }
        });
        if (best < 0) return;
        reveal(best);
        void sceneRefs.current[best]?.offsetHeight;
        whenIdle(revealNextIdle, 1000);
      };
      // One chain only: started by the first input, or (when the run is
      // scrolled with no input at all: anchor jump, restored position,
      // assistive tech) by the first safety-net reveal, so the scenes further
      // on are prepared in idle time before the scroll reaches them.
      let idleChainStarted = false;
      const startIdleChain = () => {
        if (idleChainStarted || disposed) return;
        idleChainStarted = true;
        whenIdle(revealNextIdle, 1000);
      };
      const stopEngagement = onEngagement(startIdleChain);

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

      // Hand the run's length over from the server-rendered pre-pin geometry
      // (PRESIZE_ATTR: CSS height + sticky stage) to the pin, in this same
      // task, so no frame is painted in between, in two steps:
      // 1. Before create(): drop only the sticky part (value "sticky" -> ""),
      //    so GSAP measures the stage at its natural place (top of the
      //    spacer) even when the page is already scrolled into the run, and
      //    records the stage's plain state as its original.
      // 2. After create(): drop the height too. GSAP has written the same
      //    total height inline by then, so the page height never changes.
      //    Removing it before create() made the spacer collapse for a moment
      //    (~18.5k px for Run A) and the browser's scroll anchoring pulled a
      //    reader restored further down the page up by exactly that much
      //    (back navigation into Run B: 23,863 -> 5,329). GSAP still records
      //    the spacer's inline state (empty) as its original, as before.
      if (spacer.hasAttribute(PRESIZE_ATTR)) spacer.setAttribute(PRESIZE_ATTR, "");
      // create() itself briefly sets the spacer to the stage's own height
      // while it measures (ScrollTrigger _swapPinIn), so for a moment the
      // page is shorter by the whole pin distance; when the page is already
      // scrolled below this run (a position restored before the pin exists:
      // reload / back navigation, now that the pin is built after the
      // hydration commit) scroll anchoring / clamping moved the reader by
      // that much. refresh() restores the scroll position the same way;
      // create() alone doesn't.
      const scrollBefore = window.scrollY;

      const trigger = ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: `+=${totalPct * SCROLL_SLOWDOWN}%`,
        pin: true,
        pinSpacing: true,
        // QC4 Q4-1: our own server-rendered wrapper is the pin-spacer, so
        // GSAP never moves the stage in the DOM. By default it creates a
        // spacer div and re-inserts the stage into it, at creation and on
        // every refresh (ScrollTrigger's _swapPinIn/_swapPinOut). A
        // re-inserted subtree is painted as new content: the hero poster
        // (mobile LCP element) became a second, later and larger LCP entry
        // at pin setup (~2 s at 4x CPU, after its 0.95→1 scale entrance).
        // With a native spacer GSAP only writes the spacer's inline styles
        // (the same ones it puts on its own spacer); layout and pinning are
        // unchanged.
        pinSpacer: spacer,
        // Any refreshPriority makes ScrollTrigger sort ALL triggers by
        // document position before every refresh (ScrollTrigger.js
        // _refreshAll: `_sort && ScrollTrigger.sort()`); without it they
        // refresh in creation order, and a trigger created before a pin
        // that sits above it is measured without that pin's spacing (all
        // pins are reverted first). That happened whenever these mobile
        // pins were created after triggers further down: Section08/11's
        // background-flow triggers after a desktop -> mobile resize (QC6
        // Q6-4: colours stuck), and now by design, since Run B/C and
        // Section08/11 hydrate or build later (idle / Activity). 0 keeps
        // the default priority; only the order becomes the page's own.
        refreshPriority: 0,
        // 0.3 -> 0.45: a bit more inertia/smoothing on fast flicks, so the
        // video scrub and cross-fades don't chase abrupt, jarring jumps —
        // part of the same "videos feel like they're stuttering" fix as the
        // per-scene skip-if-unchanged guard below.
        scrub: 0.45,
        onUpdate: (self) => {
          const runProgress = self.progress;
          lastRunProgress = runProgress;

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
            if (!rendered[index] && runProgress >= renderRanges[index].from && runProgress <= renderRanges[index].to) {
              if (opacity > 0) reveal(index);
              else revealNextFrame(index);
              startIdleChain();
            }
            if (el) {
              writeScene(index, opacity, opacity > 0 ? "visible" : "hidden", localProgress > 0 && localProgress < 1 ? "auto" : "none");
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

      // Step 2 of the hand-over above.
      spacer.removeAttribute(PRESIZE_ATTR);
      if (Math.abs(window.scrollY - scrollBefore) > 1) window.scrollTo(0, scrollBefore);

      // Faz 2 / P2: hand this run's own pinned range to the mobile video
      // scheduler (lib/mobileMedia.ts), which decides from the raw scroll
      // position which scene is active and lazily attaches/primes/releases
      // videos around it. Read-only use of the trigger — the pin, scrub and
      // per-scene windows above are untouched.

      const unregisterMedia = registerMobileRun({
        trigger,
        sceneIds: currentScenes.map((scene) => scene.id),
        windows,
      });

      return () => {
        disposed = true;
        cancelAnimationFrame(revealFrame);
        stopEngagement();
        unregisterMedia();
        trigger.kill();
        bgEntries.forEach((entry) => entry?.destroy());
      };
    };

    // Deferral relies on the server-rendered pre-pin geometry; once that is
    // gone (this effect re-running after a desktop -> mobile resize, where
    // the desktop pass removed it) build at once.
    if (!deferSetup || !spacer.hasAttribute(PRESIZE_ATTR)) return setup();

    // The pin is built outside the hydration commit, which the reader's
    // first touch during hydration makes React finish synchronously, in one
    // task with every effect (see lib/idleGsap.ts). Safe because until then
    // PRESIZE_ATTR already gives the page this run's exact geometry and a
    // stage held at the top, so nothing moves when the pin takes over.
    // - "task" (Run A, on screen): the very next task.
    // - "idle" (Run B, C, far below): idle time, or at once if the reader
    //   (or a restored/hash position) gets within two screens of the run.
    let cleanup: (() => void) | null = null;
    let settled = false;
    let cancelScheduled = () => {};
    const build = () => {
      if (settled) return;
      settled = true;
      cancelScheduled();
      window.removeEventListener("scroll", onScroll);
      cleanup = setup();
    };
    const runTop = deferSetup === "idle" ? spacer.getBoundingClientRect().top + window.scrollY : 0;
    const onScroll = () => {
      if (window.scrollY + window.innerHeight * 2 >= runTop) build();
    };
    if (deferSetup === "task") {
      const timeoutId = setTimeout(build, 0);
      cancelScheduled = () => clearTimeout(timeoutId);
    } else {
      cancelScheduled = scheduleIdle(build, 1500);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    return () => {
      settled = true;
      cancelScheduled();
      window.removeEventListener("scroll", onScroll);
      cleanup?.();
    };
  }, [reducedMotion, isMobile, deferSetup]);

  return (
    // Pin-spacer of the trigger above (see `pinSpacer`): a plain block
    // wrapper until the pin exists, then styled by GSAP exactly like the
    // spacer it would otherwise create (and move the stage into) itself.
    <div
      ref={spacerRef}
      className="md:hidden"
      {...{ [PRESIZE_ATTR]: "sticky" }}
      style={{ "--run-pad": (scenes.reduce((sum, scene) => sum + scene.endPct, 0) * SCROLL_SLOWDOWN) / 100 } as CSSProperties}
    >
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
              // See REVEAL_LEAD — keeps the hidden scenes' videos out of LCP
              // until the first input.
              contentVisibility: index === 0 ? "visible" : "hidden",
            }}
          >
            {scene.render()}
          </div>
        ))}
      </div>
    </div>
  );
}
