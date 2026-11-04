"use client";

import { useEffect, useRef, type RefObject } from "react";
import {
  mobileSceneVideo,
  useMobileSceneMedia,
  useMobileScenePosterVisible,
  whenIdle,
  type MobileSceneMedia,
  type MobileVideoSceneId,
} from "./mobileMedia";

export type RGB = readonly [number, number, number];

// Pixels within `threshold` of `key` go fully transparent; pixels up to
// `threshold+feather` beyond that ease in from 0 to full opacity — a hard
// cutoff at one distance produces a visible ring around real content
// where the backdrop's own anti-aliased/compression-noise pixels sit
// just outside the threshold. Extracted from MobileScene10.tsx's
// original inline version (see [[mobile_unified_stage_architecture]] for
// the full incident history and pixel-data verification behind these
// defaults) once the same technique was needed for a second/third video.
//
// **Border-connected flood fill, not a plain per-pixel distance test.**
// A real bug found on section2.mp4: a seed's cracked shell happened to be
// almost exactly the same RGB as the video's own flat backdrop (verified
// via real pixel sampling — not just "close", genuinely near-identical in
// spots) — no distance threshold can tell those apart by color alone, so
// a plain per-pixel test either ate a visible chunk out of the seed or
// (if tightened enough to protect it) started leaving backdrop residue
// elsewhere. Fix: only key a candidate pixel (within threshold+feather)
// if it's *reachable from the frame's outer edge* through other
// candidate pixels — real background is always connected to the border;
// an isolated same-colored region fully enclosed by different-colored
// real content (the seed shell, surrounded by dark soil) is not, and
// stays untouched regardless of how close its color is to the key.
// Tradeoff, accepted deliberately: small enclosed gaps between real
// content that happen to show true backdrop color (e.g. slivers of sky
// between two overlapping leaves) won't be keyed either, since they're
// not border-connected — visually a minor, localized static-color patch
// instead of true transparency there, far preferable to visibly damaging
// real content. Verified by rendering actual keyed output (composited
// onto solid magenta) for multiple frames spanning the whole clip: the
// seed's shell is fully intact, the sky backdrop is still cleanly
// transparent.
//
// Faz 2 / P2 (bulgu #5a) + QC3: same output, cheaper. Verified in Chromium
// on section3.mp4 and kadinsSon-fallback.mp4 (30 frames each): 0 differing
// bytes against the original per-pixel BFS implementation; 4x CPU per
// frame 36 → ~22 ms. How: squared distances computed once and kept (sqrt
// only inside the feather band — `d < x` ⇔ `d² < x²` exactly, d² is an
// integer); a scanline flood fill instead of a per-pixel BFS (fills whole
// horizontal runs, no per-pixel closure call or modulo — the same
// 4-connected border-reachable set); scratch buffers reused across frames.
// Rejected: half-resolution processing (~3.5x faster, but faces in
// kadinsSon and leaf serrations in section3 went visibly soft) and a 2x
// flood-fill grid with full-res alpha (bridged 1-px separators: 4 % of
// section3's pixels keyed differently — the seed-shell bug class above).
//
// Split into three stages so the first frame of a freshly attached video
// can be keyed across several idle callbacks (see useChromaKeyVideo); the
// per-scroll-frame path just runs all three back to back.
// Skip seeks/redraws below about one frame of change (same guard as
// scrubVideoToProgress in lib/useMobileVideoScrub.ts).
const FRAME_EPSILON = 1 / 30;

type Scratch = { n: number; mark: Uint8Array; sq: Int32Array; stack: Int32Array };
const newScratch = (n: number): Scratch => ({ n, mark: new Uint8Array(n), sq: new Int32Array(n), stack: new Int32Array(2 * n + 4) });
// Shared by the per-frame path only (the idle path below gets its own).
let shared: Scratch | null = null;
function sharedScratch(n: number) {
  if (!shared || shared.n < n) shared = newScratch(n);
  else shared.mark.fill(0, 0, n);
  return shared;
}

// Stage 1 — mark: 0 = real content, 1 = candidate (within threshold+feather).
function markCandidates(s: Scratch, data: Uint8ClampedArray, n: number, key: RGB, reachSq: number) {
  const { mark, sq } = s;
  const k0 = key[0];
  const k1 = key[1];
  const k2 = key[2];
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const dr = data[i] - k0;
    const dg = data[i + 1] - k1;
    const db = data[i + 2] - k2;
    const d = dr * dr + dg * dg + db * db;
    sq[p] = d;
    if (d < reachSq) mark[p] = 1;
  }
}

// Stage 2 — scanline flood fill from every border candidate; reached
// candidates become 2 (true background).
function fillFromBorder(s: Scratch, width: number, height: number) {
  const { mark, stack } = s;
  let sp = 0;
  const seed = (x: number, y: number) => {
    if (mark[y * width + x] === 1) {
      stack[sp++] = x;
      stack[sp++] = y;
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x, 0);
    seed(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    seed(0, y);
    seed(width - 1, y);
  }
  while (sp > 0) {
    const y = stack[--sp];
    const x = stack[--sp];
    const row = y * width;
    if (mark[row + x] !== 1) continue;
    let left = x;
    while (left > 0 && mark[row + left - 1] === 1) left--;
    let right = x;
    while (right < width - 1 && mark[row + right + 1] === 1) right++;
    for (let c = left; c <= right; c++) mark[row + c] = 2;
    if (y > 0) {
      const up = row - width;
      let inRun = false;
      for (let c = left; c <= right; c++) {
        if (mark[up + c] === 1) {
          if (!inRun) {
            stack[sp++] = c;
            stack[sp++] = y - 1;
            inRun = true;
          }
        } else inRun = false;
      }
    }
    if (y < height - 1) {
      const down = row + width;
      let inRun = false;
      for (let c = left; c <= right; c++) {
        if (mark[down + c] === 1) {
          if (!inRun) {
            stack[sp++] = c;
            stack[sp++] = y + 1;
            inRun = true;
          }
        } else inRun = false;
      }
    }
  }
}

// Stage 3 — alpha for the background pixels.
function applyAlpha(s: Scratch, data: Uint8ClampedArray, n: number, threshold: number, feather: number) {
  const { mark, sq } = s;
  const thresholdSq = threshold * threshold;
  for (let p = 0, i = 3; p < n; p++, i += 4) {
    if (mark[p] !== 2) continue;
    const d = sq[p];
    data[i] = d < thresholdSq ? 0 : Math.round((255 * (Math.sqrt(d) - threshold)) / feather);
  }
}

export function chromaKeyFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  key: RGB,
  threshold: number,
  feather: number
) {
  const frame = ctx.getImageData(0, 0, width, height);
  const n = width * height;
  const reach = threshold + feather;
  const s = sharedScratch(n);
  markCandidates(s, frame.data, n, key, reach * reach);
  fillFromBorder(s, width, height);
  applyAlpha(s, frame.data, n, threshold, feather);
  ctx.putImageData(frame, 0, 0);
}

// The same three stages, one per scheduled callback (idle callbacks by
// default, or animation frames), on a snapshot of the frame; only the
// finished frame is put on the visible canvas. Returns a cancel function.
// `isStale()` lets the caller abandon it (a normal draw won).
type Schedule = (callback: () => void) => void;
const inIdle: Schedule = (callback) => whenIdle(callback, 500);
const inFrames: Schedule = (callback) => {
  requestAnimationFrame(callback);
};
function chromaKeyFrameInIdle(
  source: CanvasImageSource,
  target: CanvasRenderingContext2D,
  width: number,
  height: number,
  key: RGB,
  threshold: number,
  feather: number,
  isStale: () => boolean,
  onDone: () => void,
  schedule: Schedule = inIdle
) {
  let cancelled = false;
  const n = width * height;
  const reach = threshold + feather;
  let frame: ImageData | null = null;
  let s: Scratch | null = null;
  const steps = [
    () => {
      // Read the frame through the VISIBLE canvas itself, then put its
      // previous pixels back in the same task (no paint in between, so
      // nothing shows). QC5 Q5-3 / K5: the first per-scroll-frame draw on
      // this canvas cost 92-150 ms at 4x CPU, ~40-50 ms of it the main
      // thread waiting on the GPU for the first video-to-canvas readback of
      // that canvas (it used to happen here on a throwaway offscreen
      // canvas, so the visible one still paid its own first time in rAF).
      const previous = target.getImageData(0, 0, width, height);
      target.drawImage(source, 0, 0, width, height);
      frame = target.getImageData(0, 0, width, height);
      target.putImageData(previous, 0, 0);
      return true;
    },
    () => {
      s = newScratch(n);
      markCandidates(s, frame!.data, n, key, reach * reach);
      return true;
    },
    () => {
      fillFromBorder(s!, width, height);
      return true;
    },
    () => {
      applyAlpha(s!, frame!.data, n, threshold, feather);
      target.putImageData(frame!, 0, 0);
      // Pre-allocate the per-scroll-frame path's scratch buffers (typed
      // arrays sized to this canvas) here too, not in the first rAF draw.
      sharedScratch(n);
      onDone();
      return true;
    },
  ];
  let step = 0;
  const run = () => {
    // A normal (rAF) draw in between already painted a newer, correct
    // frame — just stop.
    if (cancelled || isStale()) return;
    if (!steps[step++]()) return;
    if (step < steps.length) schedule(run);
  };
  schedule(run);
  return () => {
    cancelled = true;
  };
}


// Draws a hidden <video> to a visible <canvas> on every scroll tick,
// keying out `key` (that video's own flat, already-colorkeyed backdrop)
// in real time — genuine per-pixel transparency computed client-side,
// not dependent on any browser's native video-alpha decode support (the
// thing that was unreliable enough to cause a real "white background on
// mobile" bug for Section10 — see [[mobile_video_playback_fixes]] and
// [[mobile_unified_stage_architecture]]).
//
// `threshold`/`feather` default to 12/10 — verified against real pixel
// histograms for every video this has been used on so far (a clean,
// near-zero-density gap between the backdrop cluster and real content
// starting well above 22). A new video should have its own histogram
// checked before assuming these same defaults are safe (see the
// ffmpeg+sharp method documented in memory) — a clip whose real content
// colors sit closer to its own backdrop needs a smaller threshold, or
// may not be a good chroma-key candidate at all (e.g. Section04's woven-
// fiber texture, which fills nearly the whole frame with almost no flat
// backdrop to key against, and has documented history of highlight
// ridges sitting close in color to its own background).
//
// Faz 2 / P2 pipeline (bulgu #1, #3, #4, #5a):
// - The video is lazily attached via lib/mobileMedia.ts like every other
//   mobile scene (returned `media` drives the JSX <source>/preload).
// - Seeks are coalesced: at most one in flight; when it lands (`seeked`),
//   the newest wanted time is issued. The resting frame for a given scroll
//   position is exactly what it was — only intermediate, never-seen-anyway
//   seeks are dropped.
// - Drawing happens in requestAnimationFrame, at most once per frame,
//   after `seeked`/`loadeddata` — no longer synchronously in the scroll
//   tick (which also drew the *pre-seek* frame whenever readyState was
//   already ≥2).
// - Canvas buffer is sized from the manifest up front, and until the first
//   real frame is drawn it shows the scene's pre-keyed alpha poster
//   (P1 keyed it with this same algorithm), so the canvas is never an
//   empty hole while the video downloads.
export function useChromaKeyVideo(
  sceneId: MobileVideoSceneId,
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  onProgressRef: RefObject<((localProgress: number) => void) | null>,
  key: RGB,
  // `onTick`: an optional extra callback fired with the raw localProgress
  // on every tick this hook's own handler runs (i.e. whenever
  // MobileStage.tsx decided the scene's progress actually changed) —
  // *before* this hook's own video-specific FRAME_EPSILON skip below, so
  // callers that need to drive something else off the same progress
  // value (e.g. Section10's dot-network reveal timeline, which doesn't
  // need frame-exact precision the way a video seek does) aren't held
  // back by that guard. See MobileScene10.tsx for the one real use.
  options?: { threshold?: number; feather?: number; onTick?: (localProgress: number) => void }
): MobileSceneMedia {
  const threshold = options?.threshold ?? 12;
  const feather = options?.feather ?? 10;
  const media = useMobileSceneMedia(sceneId, videoRef);
  const posterVisible = useMobileScenePosterVisible(sceneId);
  const posterUrl = mobileSceneVideo(sceneId).posterMobile;

  // Everything the imperative pipeline below needs, kept fresh per render
  // (assigned in an effect, per this project's React Compiler lint rules —
  // see [[eslint_react_compiler_immutability]]).
  const configRef = useRef({ key, threshold, feather, onTick: options?.onTick });
  useEffect(() => {
    configRef.current = { key, threshold, feather, onTick: options?.onTick };
  });

  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const hasVideoFrameRef = useRef(false);
  const lastProgressRef = useRef<number | null>(null);
  const lastTargetRef = useRef<number | null>(null);
  const wantedTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Canvas buffer = the video's own intrinsic mobile size (from the
  // manifest, so it's right before any metadata arrives); CSS handles the
  // on-screen size. `willReadFrequently`: every draw is followed by a
  // getImageData — keeps the backing store on the CPU instead of a GPU
  // readback per frame (and silences Chrome's console warning).
  const { width, height } = media;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    ctxRef.current = canvas.getContext("2d", { willReadFrequently: true });
  }, [canvasRef, width, height]);

  // Placeholder: the pre-keyed alpha poster, drawn once while the scene is
  // near (±2) and no real frame has been drawn yet.
  useEffect(() => {
    if (!posterVisible || hasVideoFrameRef.current) return;
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    img.src = posterUrl;
    img
      .decode()
      .then(() => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        if (cancelled || hasVideoFrameRef.current || !ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [posterVisible, posterUrl, canvasRef]);

  // Video events: seek coalescing + rAF-batched draw.
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    let disposed = false;
    let firstFrameSlicing = false;
    let redrawAfterFirstFrame = false;
    let cancelIdleKey: (() => void) | null = null;
    const draw = () => {
      rafRef.current = null;
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      // HAVE_CURRENT_DATA (2) or better — drawing earlier would paint
      // garbage/black into the canvas.
      if (!ctx || !canvas || !canvas.width || videoEl.readyState < 2) return;
      const { key: k, threshold: t, feather: f } = configRef.current;
      if (!hasVideoFrameRef.current) {
        // QC5 Q5-3 / K5: the scene was reached before the idle-time first
        // frame finished (scrolling with no input: anchor jump, restored
        // position, assistive tech). Key this first frame in four animation
        // frames instead of one 120-180 ms frame (4x CPU): readback, mark,
        // fill, alpha+put. The pre-keyed alpha poster stays on the canvas
        // meanwhile; seeks landing in between are drawn right after.
        if (firstFrameSlicing) {
          redrawAfterFirstFrame = true;
          return;
        }
        cancelIdleKey?.();
        cancelIdleKey = null;
        firstFrameSlicing = true;
        chromaKeyFrameInIdle(
          videoEl,
          ctx,
          canvas.width,
          canvas.height,
          k,
          t,
          f,
          () => disposed,
          () => {
            hasVideoFrameRef.current = true;
            firstFrameSlicing = false;
            if (redrawAfterFirstFrame) {
              redrawAfterFirstFrame = false;
              scheduleDraw();
            }
          },
          inFrames
        );
        return;
      }
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      chromaKeyFrame(ctx, canvas.width, canvas.height, k, t, f);
      hasVideoFrameRef.current = true;
    };
    const scheduleDraw = () => {
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(draw);
    };

    const onSeeked = () => {
      scheduleDraw();
      const wanted = wantedTimeRef.current;
      if (wanted !== null && Math.abs(videoEl.currentTime - wanted) > FRAME_EPSILON / 2) {
        videoEl.currentTime = wanted;
      }
    };
    // Metadata of a (re)attached source: re-apply the scene's last progress
    // (MobileStage won't call again until it changes).
    const onMetadata = () => {
      const last = lastProgressRef.current;
      lastTargetRef.current = null;
      if (last !== null && videoEl.duration) {
        const target = last * videoEl.duration;
        lastTargetRef.current = target;
        wantedTimeRef.current = target;
        if (Math.abs(videoEl.currentTime - target) > FRAME_EPSILON / 2) videoEl.currentTime = target;
      }
    };
    // A released source (lib/mobileMedia.ts, ≥3 scenes away) — the canvas
    // keeps its last frame; forget the seek state so the next attach
    // starts clean.
    const onEmptied = () => {
      lastTargetRef.current = null;
      wantedTimeRef.current = null;
    };

    videoEl.addEventListener("seeked", onSeeked);
    // QC2 K5 / QC3: the first real frame of a freshly attached source
    // (the scene is still ≥1 away at that point) is keyed in four idle
    // slices — draw+read, mark, fill, alpha+put — instead of one long task;
    // only the finished frame reaches the visible canvas. Any normal (rAF)
    // draw in between wins and the slices stop. Later frames go through
    // rAF as usual.
    const onLoadedData = () => {
      if (hasVideoFrameRef.current) {
        scheduleDraw();
        return;
      }
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas || !canvas.width) return;
      cancelIdleKey?.();
      const { key: k, threshold: t, feather: f } = configRef.current;
      cancelIdleKey = chromaKeyFrameInIdle(
        videoEl,
        ctx,
        canvas.width,
        canvas.height,
        k,
        t,
        f,
        () => hasVideoFrameRef.current || firstFrameSlicing || rafRef.current !== null || videoEl.readyState < 2,
        () => {
          hasVideoFrameRef.current = true;
        }
      );
    };
    videoEl.addEventListener("loadeddata", onLoadedData);
    videoEl.addEventListener("loadedmetadata", onMetadata);
    videoEl.addEventListener("emptied", onEmptied);
    return () => {
      videoEl.removeEventListener("seeked", onSeeked);
      videoEl.removeEventListener("loadeddata", onLoadedData);
      videoEl.removeEventListener("loadedmetadata", onMetadata);
      videoEl.removeEventListener("emptied", onEmptied);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      cancelIdleKey?.();
      disposed = true;
    };
  }, [videoRef, canvasRef]);

  // The skip-if-unchanged guard (see the original note: MobileStage fans
  // ticks out to every scene of a run) still runs before any video work.
  useEffect(() => {
    onProgressRef.current = (localProgress: number) => {
      configRef.current.onTick?.(localProgress);
      lastProgressRef.current = localProgress;

      const videoEl = videoRef.current;
      if (!videoEl) return;
      const duration = videoEl.duration;
      if (!duration || Number.isNaN(duration)) return;

      const target = localProgress * duration;
      if (lastTargetRef.current !== null && Math.abs(lastTargetRef.current - target) <= FRAME_EPSILON) return;
      lastTargetRef.current = target;
      wantedTimeRef.current = target;
      // One seek in flight at a time; `seeked` issues the newest target.
      if (!videoEl.seeking) videoEl.currentTime = target;
    };
  });

  return media;
}
