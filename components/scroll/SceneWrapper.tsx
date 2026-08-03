import { forwardRef } from "react";

type SceneWrapperProps = {
  id: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

// `dvh` (dynamic viewport height), not `vh` — mobile Safari/Chrome resize
// the *visual* viewport as their address bar shows/hides while scrolling,
// but `100vh` is fixed to the *largest possible* viewport regardless, so a
// `min-h-screen` section's real on-screen height keeps changing underneath
// GSAP ScrollTrigger's cached trigger positions (computed once, against
// whatever height happened to be true at that moment). `dvh` tracks the
// actual visible viewport instead, so a pinned/triggered position stays
// correct as the chrome comes and goes. See [[mobile_scroll_architecture]].
export const SceneWrapper = forwardRef<HTMLElement, SceneWrapperProps>(
  function SceneWrapper({ id, className = "", style, children }, ref) {
    return (
      <section
        id={id}
        ref={ref}
        style={style}
        className={`relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden ${className}`}
      >
        {children}
      </section>
    );
  }
);
