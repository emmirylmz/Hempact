export type Fiber = {
  id: number;
  startXPct: number;
  startYPct: number;
  startRotate: number;
  endXPct: number;
  endYPct: number;
  endRotate: number;
  length: number;
  color: "muted" | "deep";
};

// Deterministic pseudo-random so server and client render the same scattered
// field (Math.random() would cause a hydration mismatch here).
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Collapses any environment-level floating point drift (server vs. client)
// to an identical short string, so hydration never mismatches over it.
function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

const FIBER_COUNT = 42;
const GRID_COLS = 7;
const GRID_ROWS = Math.ceil(FIBER_COUNT / GRID_COLS);

// The "surface" the fibers converge into — a centered rectangle, in percent
// of the container.
const SHEET = { x0: 30, x1: 70, y0: 36, y1: 64 };

export const fibers: Fiber[] = Array.from({ length: FIBER_COUNT }, (_, i) => {
  const r1 = seededRandom(i * 12.9898);
  const r2 = seededRandom(i * 78.233 + 1);
  const r3 = seededRandom(i * 37.719 + 2);
  const r4 = seededRandom(i * 93.989 + 3);
  const r5 = seededRandom(i * 15.123 + 4);

  const col = i % GRID_COLS;
  const row = Math.floor(i / GRID_COLS);

  const endXPct = SHEET.x0 + ((col + 0.5) / GRID_COLS) * (SHEET.x1 - SHEET.x0) + (r4 - 0.5) * 3;
  const endYPct = SHEET.y0 + ((row + 0.5) / GRID_ROWS) * (SHEET.y1 - SHEET.y0) + (r5 - 0.5) * 3;

  return {
    id: i,
    startXPct: round(4 + r1 * 90),
    startYPct: round(8 + r2 * 84),
    startRotate: round(r3 * 360),
    endXPct: round(endXPct),
    endYPct: round(endYPct),
    endRotate: round((r4 - 0.5) * 16),
    length: round(22 + r5 * 20),
    color: i % 2 === 0 ? "muted" : "deep",
  };
});
