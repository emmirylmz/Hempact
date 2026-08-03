"use client";

import { useEffect, useRef, type RefObject } from "react";
import { primeMobileVideo } from "./useMobileVideoScrub";

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
export function chromaKeyFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  key: RGB,
  threshold: number,
  feather: number
) {
  const frame = ctx.getImageData(0, 0, width, height);
  const data = frame.data;
  const n = width * height;

  const distAt = (p: number) => {
    const i = p * 4;
    const dr = data[i] - key[0];
    const dg = data[i + 1] - key[1];
    const db = data[i + 2] - key[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };

  const candidate = new Uint8Array(n);
  const dist = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const d = distAt(p);
    dist[p] = d;
    candidate[p] = d < threshold + feather ? 1 : 0;
  }

  // BFS flood fill seeded from every candidate pixel on the border —
  // `visited` ends up marking exactly the border-connected "true
  // background" region.
  const visited = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qHead = 0;
  let qTail = 0;
  const tryPush = (p: number) => {
    if (!visited[p] && candidate[p]) {
      visited[p] = 1;
      queue[qTail++] = p;
    }
  };
  for (let x = 0; x < width; x++) {
    tryPush(x);
    tryPush((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    tryPush(y * width);
    tryPush(y * width + (width - 1));
  }
  while (qHead < qTail) {
    const p = queue[qHead++];
    const x = p % width;
    const y = (p / width) | 0;
    if (x > 0) tryPush(p - 1);
    if (x < width - 1) tryPush(p + 1);
    if (y > 0) tryPush(p - width);
    if (y < height - 1) tryPush(p + width);
  }

  for (let p = 0; p < n; p++) {
    if (!visited[p]) continue;
    const i = p * 4;
    const d = dist[p];
    data[i + 3] = d < threshold ? 0 : Math.round((255 * (d - threshold)) / feather);
  }
  ctx.putImageData(frame, 0, 0);
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
export function useChromaKeyVideo(
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
  // back by that guard. Lets a scene combine "scrub this chroma-keyed
  // video" with "also drive this other scroll-linked thing" without the
  // caller having to reimplement its own onProgressRef wiring around this
  // hook's — see MobileScene10.tsx for the one real use of this so far.
  options?: { threshold?: number; feather?: number; onTick?: (localProgress: number) => void }
) {
  const threshold = options?.threshold ?? 12;
  const feather = options?.feather ?? 10;

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl) primeMobileVideo(videoEl);
  }, [videoRef]);

  // Sizes the canvas's real pixel buffer to the source video's own
  // intrinsic resolution once known — CSS handles the on-screen display
  // size separately (VIDEO_RECT-style percentages or plain layout,
  // set by the caller).
  useEffect(() => {
    const videoEl = videoRef.current;
    const canvas = canvasRef.current;
    if (!videoEl || !canvas) return;

    const setCanvasSize = () => {
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
    };
    if (videoEl.readyState >= 1) setCanvasSize();
    else videoEl.addEventListener("loadedmetadata", setCanvasSize, { once: true });
    return () => videoEl.removeEventListener("loadedmetadata", setCanvasSize);
  }, [videoRef, canvasRef]);

  // `chromaKeyFrame` is a full-frame `getImageData`/border-flood-fill/
  // `putImageData` pass — genuinely expensive JS work per call (this
  // hook's own comment above already documents the flood-fill's O(pixel
  // count) cost). MobileStage.tsx calls every scene's `onLocalProgress`
  // on every scroll tick, including scenes that are fully outside their
  // own window and not visibly changing at all (see
  // [[mobile_unified_stage_architecture]]) — before this guard, that
  // meant Section03/Section10's whole canvas re-key ran on *every* scroll
  // frame throughout the entire run they're part of, not just while they
  // were actually on screen. A confirmed real contributor to "videos feel
  // like they're stuttering" on real phones. Skipping the seek/redraw/
  // rekey entirely when the target frame hasn't moved by more than about
  // a frame's worth mirrors the same epsilon guard
  // `lib/useMobileVideoScrub.ts`'s `scrubVideoToProgress` uses for plain
  // video scenes, just applied before the much costlier canvas work here.
  const lastTargetRef = useRef<number | null>(null);
  const FRAME_EPSILON = 1 / 30;
  // Holds a cleanup for whichever "wait for this seek to actually decode"
  // listener pair is currently pending, so a later tick arriving before an
  // earlier one has decoded doesn't leave stale listeners piled up on the
  // video element — see the retry logic below.
  const pendingRetryRef = useRef<(() => void) | null>(null);

  // No deps array — kept fresh every render, assigned in an effect per
  // this project's React Compiler lint rules (see
  // [[eslint_react_compiler_immutability]]).
  useEffect(() => {
    onProgressRef.current = (localProgress: number) => {
      options?.onTick?.(localProgress);

      const videoEl = videoRef.current;
      const canvas = canvasRef.current;
      if (!videoEl || !canvas) return;
      const duration = videoEl.duration;
      if (!duration || Number.isNaN(duration)) return;

      const target = localProgress * duration;
      if (lastTargetRef.current !== null && Math.abs(lastTargetRef.current - target) <= FRAME_EPSILON) {
        return;
      }
      lastTargetRef.current = target;
      videoEl.currentTime = target;

      pendingRetryRef.current?.();
      pendingRetryRef.current = null;

      const draw = () => {
        if (!canvas.width || !canvas.height) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        chromaKeyFrame(ctx, canvas.width, canvas.height, key, threshold, feather);
      };

      // HAVE_CURRENT_DATA (2) or better — drawing before the seek has
      // produced a real decoded frame would paint garbage/black into the
      // canvas. `currentTime` assignment is async (the browser decodes to
      // the target frame in the background), so `readyState` reads stale
      // immediately after setting it — that's expected, not a stall. The
      // bug this replaces: previously this just gave up for the whole tick
      // when that happened, with no retry until the *next* scroll-driven
      // tick happened to call this again — on a real phone, decode usually
      // catches up before that next tick arrives, so the gap was invisible.
      // Anywhere decode is slower relative to tick frequency (confirmed:
      // Chrome DevTools' device-mode/remote-debugging-driven tabs, per this
      // project's own [[chrome_automation_video_throttling]] history — but
      // in principle any slow-decode real device too), the canvas could go
      // permanently blank: readyState never happened to be >=2 at the exact
      // synchronous instant this ran, and nothing ever asked again. Fixed
      // by listening for the video's own confirmation that this seek's
      // frame actually decoded (`seeked`, or `loadeddata` for the very
      // first frame before any seek has completed yet) and drawing then —
      // correct regardless of how long decode takes, not reliant on
      // another scroll tick happening to arrive later.
      if (videoEl.readyState >= 2) {
        draw();
        return;
      }

      const onReady = () => {
        videoEl.removeEventListener("seeked", onReady);
        videoEl.removeEventListener("loadeddata", onReady);
        pendingRetryRef.current = null;
        draw();
      };
      videoEl.addEventListener("seeked", onReady, { once: true });
      videoEl.addEventListener("loadeddata", onReady, { once: true });
      pendingRetryRef.current = () => {
        videoEl.removeEventListener("seeked", onReady);
        videoEl.removeEventListener("loadeddata", onReady);
      };
    };
  });
}
