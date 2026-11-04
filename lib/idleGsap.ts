"use client";

import { useEffect, type DependencyList, type RefObject } from "react";
import { gsap } from "@/lib/gsapConfig";

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

// requestIdleCallback with a cancel handle (iOS Safari has none: timeout
// fallback, same as lib/mobileMedia.ts's whenIdle).
export function scheduleIdle(cb: () => void, timeout: number): () => void {
  const w = window as IdleWindow;
  if (w.requestIdleCallback && w.cancelIdleCallback) {
    const id = w.requestIdleCallback(cb, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = setTimeout(cb, 50);
  return () => clearTimeout(id);
}

// Like useGSAP, but the setup runs in an idle callback after the commit
// instead of inside it.
//
// Why: the page hydrates as one React root. While it hydrates, the first
// touch makes React finish hydration AND flush every passive effect
// synchronously, in the same task as the input (measured, 4x CPU: one
// 800-1000 ms task when the reader starts scrolling ~0.8 s after
// navigation). Setups that only prepare a reveal far down the page
// (Section08/11/12 "top 70%" toggles) do not need to be in that task; each
// is 15-30 ms on its own, as its own idle task.
//
// Animations and ScrollTriggers created in `setup` are collected by a
// gsap.context (scoped to `scope`) and reverted on cleanup/dependency
// change, exactly like useGSAP; a function returned by `setup` runs on
// revert too. Only for setups whose initial state may appear late: the
// server-rendered markup (final, visible state) is what shows until then.
export function useIdleGsap(
  setup: () => void | (() => void),
  scope: RefObject<Element | null>,
  dependencies: DependencyList,
  { enabled = true, timeout = 1500 }: { enabled?: boolean; timeout?: number } = {}
) {
  useEffect(() => {
    if (!enabled) return;
    let ctx: gsap.Context | null = null;
    const cancel = scheduleIdle(() => {
      ctx = gsap.context(() => setup(), scope.current ?? undefined);
    }, timeout);
    return () => {
      cancel();
      ctx?.revert();
    };
    // `setup` is intentionally not a dependency (same contract as useGSAP's
    // `dependencies`): it is re-created every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, timeout, ...dependencies]);
}
