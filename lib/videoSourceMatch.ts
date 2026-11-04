"use client";

import { useEffect, type RefObject } from "react";

// QC6 Q6-3: every video here picks its file with `<source media="...">`
// (mobile copies: MOBILE_SOURCE_MEDIA, desktop copies: min-width 768px),
// so the hidden breakpoint twin never downloads anything. But the media
// attribute is only evaluated during resource selection: a copy whose
// `<source>` was already in the DOM while its query did not match (the
// server-rendered hero, or any attached source) ends in NETWORK_NO_SOURCE
// and stays dead after the window crosses the breakpoint (F12 device
// toolbar, rotating a tablet, resizing a desktop window). When the query
// starts matching, run selection again — only for a video that has a
// `<source>` and found none, so nothing that is loading or loaded is
// touched.
export function useReloadWhenSourceMatches(video: RefObject<HTMLVideoElement | null>, query: string) {
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => {
      const el = video.current;
      if (!mql.matches || !el) return;
      if (el.networkState === HTMLMediaElement.NETWORK_NO_SOURCE && el.querySelector("source")) el.load();
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [video, query]);
}
