/* ---------------------------------------------------------------------------
   Composite scoring (blueprint §5.4).

   Deliberately isolated in one file with no database or React imports,
   because this is the piece most likely to be rewritten once real
   assessment data exists and a physio has opinions about the weights.
   Independently written for the root schema, not a port of
   prototype/lib/scoring.ts — see docs/adr/0005 for that precedent
   (BodyMap adapter) applied here too.

   All scores are FITNESS metrics, not health indicators. Copy anywhere in
   the product must reflect that — "below your target range", never
   "your recovery is poor" (CLAUDE.md's wellness-studio Iron Rule).
--------------------------------------------------------------------------- */

export type Measurement = { muscleKey: string; degrees: number; target: number };

export type Scores = { flexibility: number; mobility: number; recovery: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Mean of degrees/target across all measured groups, as a percentage. */
export function flexibilityScore(ms: Measurement[]): number {
  if (!ms.length) return 0;
  const sum = ms.reduce((s, m) => s + m.degrees / m.target, 0);
  return Math.round((sum / ms.length) * 100);
}

/** Weighted toward the joints that gate compound movement (blueprint §5.4). */
const MOBILITY_WEIGHTS: Record<string, number> = {
  thoracic: 0.3,
  hip_flexors: 0.25,
  shoulders: 0.25,
  calves: 0.2,
};
export function mobilityScore(ms: Measurement[]): number {
  if (!ms.length) return 0;
  let total = 0;
  let weight = 0;
  for (const [key, w] of Object.entries(MOBILITY_WEIGHTS)) {
    const m = ms.find((x) => x.muscleKey === key);
    if (m) {
      total += (m.degrees / m.target) * w;
      weight += w;
    }
  }
  return weight ? Math.round((total / weight) * 100) : 0;
}

/**
 * Readiness. Blends home-programme adherence, wearable linkage, recent
 * perceived exertion and attendance streak (blueprint §5.4).
 *
 * Home programmes (§4.1.6) and wearable linkage (§4.1.9) are both Phase 2/3
 * — not built at root yet — so `adherence` and `hasWearable` have no real
 * signal to read today. Both default to their documented placeholder
 * values (0 adherence, no wearable) rather than being left out of the
 * function shape, so the formula does not change when that data exists.
 */
export function recoveryScore(input: {
  adherence: number; // 0..1 completions against expected; 0 until home programmes exist (P2)
  hasWearable: boolean; // placeholder flat bonus until real HRV/sleep exists (P3)
  recentRpe: number; // 1..10, lower is easier
  streak: number; // consecutive attended days
}): number {
  const { adherence, hasWearable, recentRpe, streak } = input;
  return Math.round(
    clamp(
      56 + adherence * 22 + (hasWearable ? 8 : 0) + (10 - recentRpe) * 1.6 + streak * 0.7,
      30,
      99,
    ),
  );
}

export function computeScores(args: {
  measurements: Measurement[];
  adherence: number;
  hasWearable: boolean;
  recentRpe: number;
  streak: number;
}): Scores {
  return {
    flexibility: flexibilityScore(args.measurements),
    mobility: mobilityScore(args.measurements),
    recovery: recoveryScore(args),
  };
}

/** The tightest groups, for "priority areas today". */
export function priorityAreas(ms: Measurement[], n = 3) {
  return [...ms]
    .map((m) => ({ ...m, pct: m.degrees / m.target }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, n);
}
