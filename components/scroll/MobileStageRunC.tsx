"use client";

import { useRef } from "react";
import { MobileStage, type StageScene } from "./MobileStage";
import { colors } from "@/lib/theme";
import { MobileScene12 } from "@/components/scenes/Section12Closing/MobileScene12";

type ProgressHandler = ((localProgress: number) => void) | null;

// Run C: Section12, the last and simplest run — a single scene, no
// cross-fade needed (see [[mobile_unified_stage_architecture]]).
// `endPct` (150) matches this section's previous mobile budget exactly.
export function MobileStageRunC() {
  const progress12 = useRef<ProgressHandler>(null);

  const scenes: StageScene[] = [
    {
      id: "12",
      endPct: 150,
      color: colors.warmLinen,
      render: () => <MobileScene12 onProgressRef={progress12} />,
      onLocalProgress: (p) => progress12.current?.(p),
    },
  ];

  // z-[2]: matches Section12's own original value — lowest of all,
  // nothing after it in the document to outrank.
  return <MobileStage id="mobile-stage-run-c" scenes={scenes} className="z-[2]" />;
}
