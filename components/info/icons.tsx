import { colors } from "@/lib/theme";

// Minimal line-art icons in the same idiom already used across the site's
// own illustrations (CycleIllustration, ImpactIllustration): thin strokes,
// a soft low-opacity glow dot, mutedCycleRed/deepHemp accents — built here
// rather than pulled from a generic icon pack so they read as part of the
// same visual system instead of a mismatched add-on.

export function TogetherIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="h-full w-full">
      <circle cx="46" cy="58" r="30" stroke={colors.deepHemp} strokeWidth="1.5" opacity="0.55" />
      <circle cx="74" cy="58" r="30" stroke={colors.mutedCycleRed} strokeWidth="1.5" opacity="0.55" />
      <circle cx="60" cy="58" r="3.2" fill={colors.mutedCycleRed} />
    </svg>
  );
}

export function LeafIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="h-full w-full">
      <path
        d="M60 22C60 22 84 34 84 62C84 84 60 98 60 98C60 98 36 84 36 62C36 34 60 22 60 22Z"
        stroke={colors.deepHemp}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M60 30V96" stroke={colors.deepHemp} strokeWidth="1" opacity="0.6" />
      <path d="M60 46C60 46 48 48 44 58" stroke={colors.mutedHemp} strokeWidth="1" opacity="0.7" />
      <path d="M60 46C60 46 72 48 76 58" stroke={colors.mutedHemp} strokeWidth="1" opacity="0.7" />
      <path d="M60 66C60 66 50 68 47 76" stroke={colors.mutedHemp} strokeWidth="1" opacity="0.7" />
      <path d="M60 66C60 66 70 68 73 76" stroke={colors.mutedHemp} strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

export function VoiceIcon() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="h-full w-full">
      <path
        d="M32 42C32 34.27 38.27 28 46 28H74C81.73 28 88 34.27 88 42V62C88 69.73 81.73 76 74 76H56L42 88V76H46C38.27 76 32 69.73 32 62V42Z"
        stroke={colors.mutedCycleRed}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M46 46H74" stroke={colors.mutedCycleRed} strokeWidth="1.5" opacity="0.5" />
      <path d="M46 58H64" stroke={colors.mutedCycleRed} strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

export function StatRingIcon({ percent, label }: { percent: number; label: string }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percent / 100);

  return (
    <svg viewBox="0 0 120 120" fill="none" className="h-full w-full -rotate-90">
      <circle cx="60" cy="60" r={radius} stroke={colors.softClayRose} strokeWidth="4" opacity="0.35" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        stroke={colors.mutedCycleRed}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
      <text
        x="60"
        y="60"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="22"
        fontFamily="var(--font-display)"
        fill={colors.charcoal}
        className="rotate-90"
        style={{ transformOrigin: "60px 60px" }}
      >
        {label}
      </text>
    </svg>
  );
}

export function NetworkIcon() {
  const count = 6;
  const center = { x: 60, y: 60 };
  const radius = 32;
  const points = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) };
  });

  return (
    <svg viewBox="0 0 120 120" fill="none" className="h-full w-full">
      {points.map((p, i) => {
        const next = points[(i + 1) % points.length];
        return <line key={i} x1={p.x} y1={p.y} x2={next.x} y2={next.y} stroke={colors.mutedCycleRed} strokeWidth="1" opacity="0.35" />;
      })}
      {points.map((p, i) => (
        <line key={`c${i}`} x1={center.x} y1={center.y} x2={p.x} y2={p.y} stroke={colors.mutedCycleRed} strokeWidth="0.75" opacity="0.2" />
      ))}
      {points.map((p, i) => (
        <circle key={`d${i}`} cx={p.x} cy={p.y} r="3" fill={colors.mutedCycleRed} opacity="0.7" />
      ))}
      <circle cx={center.x} cy={center.y} r="7" fill={colors.mutedCycleRed} opacity="0.18" />
      <circle cx={center.x} cy={center.y} r="4" fill={colors.mutedCycleRed} />
    </svg>
  );
}

export const INFO_ICONS = {
  together: TogetherIcon,
  leaf: LeafIcon,
  voice: VoiceIcon,
  network: NetworkIcon,
} as const;
