"use client";

import { useEffect, useState, type RefObject } from "react";

// All 9 desktop scroll-scrub videos (~36MB total) used to render their
// `<source>` unconditionally, so `preload="auto"` made every one of them
// start downloading in full the moment the page loaded, regardless of
// scroll position — 9 simultaneous multi-MB fetches competing for the same
// connection pool right at first paint. Reverting to `preload="metadata"`
// isn't an option here: that was already tried and reverted (see
// [[mobile_scroll_architecture]]) because on-demand network seeks during
// scroll-scrub feel visibly disconnected from the scroll. The actual fix
// that memory landed on but never implemented: keep `preload="auto"`, just
// delay *starting* it per-section until the section is actually
// approaching, via IntersectionObserver — same eager local buffering once
// triggered, no simultaneous page-load stampede.
//
// `rootMargin` gives enough scroll runway (in viewport-heights) for the
// video to finish buffering before the user's scroll position actually
// reaches it — every pinned section here spans at least 150% of a
// viewport's worth of scroll, so a margin this size still leaves real lead
// time even on a slow connection.
const DEFAULT_ROOT_MARGIN = "150% 0px";

export function useLazyVideoSource(
  container: RefObject<Element | null>,
  video: RefObject<HTMLVideoElement | null>,
  rootMargin: string = DEFAULT_ROOT_MARGIN
) {
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    if (isNear) return;
    const el = container.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      // Deferred, never called synchronously in the effect body — see
      // [[eslint_react_compiler_immutability]] for why a bare setState
      // call here trips this project's React Compiler lint rule.
      const id = setTimeout(() => setIsNear(true), 0);
      return () => clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setIsNear(true);
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [container, isNear, rootMargin]);

  // `<source>` children only exist in the DOM once `isNear` flips (see each
  // call site's JSX) — `load()` here just makes the browser start fetching
  // that new source immediately rather than depending on a spec-optional
  // "source inserted" auto-detection some engines are stricter about.
  useEffect(() => {
    if (isNear) video.current?.load();
  }, [isNear, video]);

  return isNear;
}
