"use client";

import { useRef } from "react";
import { MobileStage, type StageScene } from "./MobileStage";
import { colors } from "@/lib/theme";
import { MobileScene01 } from "@/components/scenes/Section01FirstEncounter/MobileScene01";
import { MobileScene02 } from "@/components/scenes/Section02RegenerativeFiber/MobileScene02";
import { MobileScene03 } from "@/components/scenes/Section03FiberInsideStem/MobileScene03";
import { MobileScene04 } from "@/components/scenes/Section04FiberToSurface/MobileScene04";
import { MobileScene05 } from "@/components/scenes/Section05PadLayers/MobileScene05";
import { MobileScene06 } from "@/components/scenes/Section06LiquidManagement/MobileScene06";
import { MobileScene07 } from "@/components/scenes/Section07SkinContact/MobileScene07";

type ProgressHandler = ((localProgress: number) => void) | null;

// Run A: Section01–07, the first and largest contiguous run of mobile-
// pinned scenes (see [[mobile_scroll_architecture]] for why these got
// consolidated into one stage instead of 7 independent pins). `endPct`
// values are copied straight from each section's own previous mobile
// `end: "+=NNN%"` budget, preserving their already-tuned relative pacing.
export function MobileStageRunA() {
  const progress01 = useRef<ProgressHandler>(null);
  const progress02 = useRef<ProgressHandler>(null);
  const progress03 = useRef<ProgressHandler>(null);
  const progress04 = useRef<ProgressHandler>(null);
  const progress05 = useRef<ProgressHandler>(null);
  const progress06 = useRef<ProgressHandler>(null);
  const progress07 = useRef<ProgressHandler>(null);

  const scenes: StageScene[] = [
    {
      id: "01",
      endPct: 150,
      color: colors.mistSage,
      render: () => <MobileScene01 onProgressRef={progress01} />,
      onLocalProgress: (p) => progress01.current?.(p),
    },
    {
      id: "02",
      endPct: 420,
      color: colors.paleHemp,
      render: () => <MobileScene02 onProgressRef={progress02} />,
      onLocalProgress: (p) => progress02.current?.(p),
    },
    {
      id: "03",
      endPct: 260,
      color: colors.softIvory,
      render: () => <MobileScene03 onProgressRef={progress03} />,
      onLocalProgress: (p) => progress03.current?.(p),
    },
    {
      id: "04",
      endPct: 280,
      color: colors.paleHemp,
      render: () => <MobileScene04 onProgressRef={progress04} />,
      onLocalProgress: (p) => progress04.current?.(p),
    },
    {
      id: "05",
      endPct: 300,
      color: colors.studioGray,
      render: () => <MobileScene05 onProgressRef={progress05} />,
      onLocalProgress: (p) => progress05.current?.(p),
    },
    {
      id: "06",
      endPct: 200,
      color: colors.softClayRose,
      render: () => <MobileScene06 onProgressRef={progress06} />,
      onLocalProgress: (p) => progress06.current?.(p),
    },
    {
      id: "07",
      endPct: 220,
      color: colors.paleHemp,
      render: () => <MobileScene07 onProgressRef={progress07} />,
      onLocalProgress: (p) => progress07.current?.(p),
    },
  ];

  // z-[24]: highest of the run — matches Section01's own original value,
  // the top of the descending sitewide scheme (see
  // Section01FirstEncounter's own comment); needs to outrank Section08
  // (z-[10]), the next thing after this run in the document.
  return <MobileStage id="mobile-stage-run-a" scenes={scenes} className="z-[24]" />;
}
