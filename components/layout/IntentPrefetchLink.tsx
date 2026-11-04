"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";

// QC5 Q5-1: a <Link> that prefetches only once the user shows intent
// (pointer over it, touch or keyboard focus) instead of when it enters the
// viewport. Used for the nav links to /iletisim and /hakkimizda: those two
// pages preload the Fraunces italic files and their own font CSS
// (app/[lang]/iletisim/page.tsx), and a prefetch runs a route's preload
// hints on the current page. With the default viewport prefetch, every page
// with the nav downloaded ~86 KB of italic it never used, and Chrome logged
// three "preloaded but not used" warnings. `prefetch={false}` alone would
// also drop the hover prefetch (App Router), so the click would wait for the
// server; switching to `null` (default behaviour) on intent keeps the fast
// navigation (Next.js prefetching guide, "Hover-triggered prefetch").
export function IntentPrefetchLink({
  onPointerEnter,
  onTouchStart,
  onFocus,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [intent, setIntent] = useState(false);

  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onPointerEnter={(event) => {
        setIntent(true);
        onPointerEnter?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
    />
  );
}
