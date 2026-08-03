import { SmoothScrollProvider } from "@/components/scroll/SmoothScrollProvider";
import { BackgroundFlow } from "@/components/scroll/BackgroundFlow";
import { MobileStageRunA } from "@/components/scroll/MobileStageRunA";
import { MobileStageRunB } from "@/components/scroll/MobileStageRunB";
import { MobileStageRunC } from "@/components/scroll/MobileStageRunC";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { colors } from "@/lib/theme";
import { Section01FirstEncounter } from "@/components/scenes/Section01FirstEncounter/Section01FirstEncounter";
import { Section02RegenerativeFiber } from "@/components/scenes/Section02RegenerativeFiber/Section02RegenerativeFiber";
import { Section03FiberInsideStem } from "@/components/scenes/Section03FiberInsideStem/Section03FiberInsideStem";
import { Section04FiberToSurface } from "@/components/scenes/Section04FiberToSurface/Section04FiberToSurface";
import { Section05PadLayers } from "@/components/scenes/Section05PadLayers/Section05PadLayers";
import { Section06LiquidManagement } from "@/components/scenes/Section06LiquidManagement/Section06LiquidManagement";
import { Section07SkinContact } from "@/components/scenes/Section07SkinContact/Section07SkinContact";
import { Section08ColorsFromNature } from "@/components/scenes/Section08ColorsFromNature/Section08ColorsFromNature";
import { Section09SoilToSoilCycle } from "@/components/scenes/Section09SoilToSoilCycle/Section09SoilToSoilCycle";
import { Section10SocialImpact } from "@/components/scenes/Section10SocialImpact/Section10SocialImpact";
import { Section11ProductFamily } from "@/components/scenes/Section11ProductFamily/Section11ProductFamily";
import { Section12Closing } from "@/components/scenes/Section12Closing/Section12Closing";

export default function Home() {
  return (
    <SmoothScrollProvider>
      <BackgroundFlow initialColor={colors.warmLinen} />
      <NavBar />
      <main>
        {/* Run A (Section01–07): on mobile, replaces the 7 sections below
            with one persistent pinned stage — see
            components/scroll/MobileStageRunA.tsx and
            [[mobile_scroll_architecture]]. Desktop still renders the 7
            sections normally (each is `hidden md:contents` on mobile). */}
        <MobileStageRunA />
        <Section01FirstEncounter />
        <Section02RegenerativeFiber />
        <Section03FiberInsideStem />
        <Section04FiberToSurface />
        <Section05PadLayers />
        <Section06LiquidManagement />
        <Section07SkinContact />
        <Section08ColorsFromNature />
        {/* Run B (Section09–10): same pattern as Run A above. */}
        <MobileStageRunB />
        <Section09SoilToSoilCycle />
        <Section10SocialImpact />
        <Section11ProductFamily />
        {/* Run C (Section12): same pattern as Run A/B above. */}
        <MobileStageRunC />
        <Section12Closing />
      </main>
      <Footer />
    </SmoothScrollProvider>
  );
}
