"use client";

import { useRef } from "react";
import { MobileStage, type StageScene } from "./MobileStage";
import { colors } from "@/lib/theme";
import { MobileScene09 } from "@/components/scenes/Section09SoilToSoilCycle/MobileScene09";
import { MobileScene10 } from "@/components/scenes/Section10SocialImpact/MobileScene10";

type ProgressHandler = ((localProgress: number) => void) | null;

// Run B: Section09–10, the second contiguous run of mobile-pinned scenes
// (see [[mobile_scroll_architecture]]/[[mobile_unified_stage_architecture]]).
// Section09's `endPct` (260) is ported from its own *desktop* pin — mobile
// never had a real pin for this section before (its old mobile branch was
// just a one-shot label fade-in, see MobileScene09.tsx's own comment).
// Section10's (240) matches its existing previous mobile budget.
export function MobileStageRunB() {
  const progress09 = useRef<ProgressHandler>(null);
  const progress10 = useRef<ProgressHandler>(null);

  const scenes: StageScene[] = [
    {
      id: "09",
      endPct: 260,
      color: colors.mutedHemp,
      render: () => <MobileScene09 onProgressRef={progress09} />,
      onLocalProgress: (p) => progress09.current?.(p),
    },
    {
      id: "10",
      endPct: 240,
      color: colors.paleHemp,
      render: () => <MobileScene10 onProgressRef={progress10} />,
      onLocalProgress: (p) => progress10.current?.(p),
    },
  ];

  // z-[8]: matches Section09's own original value, the higher of the two
  // superseded per-section z-indexes in this run — needs to outrank
  // Section11 (z-[4]), the next thing after this run in the document.
  return <MobileStage id="mobile-stage-run-b" scenes={scenes} className="z-[8]" />;
}
