import { clamp } from './reference';

/* ---------------------------------------------------------------------------
   Composite scoring.

   Deliberately isolated in one file with no database or React imports, because
   this is the piece most likely to be rewritten once real assessment data
   exists and a physio has opinions about the weights.

   All three scores are FITNESS metrics, not health indicators. Copy anywhere
   in the product must reflect that — "below your target range", never
   "your recovery is poor".
--------------------------------------------------------------------------- */

export type Measurement = { muscleKey: string; degrees: number; target: number };

export type Scores = { flexibility: number; mobility: number; recovery: number };

/** Static range across all measured groups, as a percentage of target arc. */
export function flexibilityScore(ms: Measurement[]): number {
  if (!ms.length) return 0;
  const sum = ms.reduce((s, m) => s + m.degrees / m.target, 0);
  return Math.round((sum / ms.length) * 100);
}

/** Active joint control. Weighted toward the joints that gate real movement. */
const MOBILITY_WEIGHTS: Record<string, number> = {
  hip_flexors: 0.25, thoracic: 0.3, shoulders: 0.25, calves: 0.2,
};
export function mobilityScore(ms: Measurement[]): number {
  if (!ms.length) return 0;
  let total = 0, weight = 0;
  for (const [key, w] of Object.entries(MOBILITY_WEIGHTS)) {
    const m = ms.find((x) => x.muscleKey === key);
    if (m) { total += (m.degrees / m.target) * w; weight += w; }
  }
  return weight ? Math.round((total / weight) * 100) : 0;
}

/**
 * Readiness. Blends home-programme adherence, wearable linkage, recent
 * perceived exertion and attendance streak.
 *
 * The wearable term is a placeholder for real HRV and sleep. Once a device is
 * linked for real, replace `hasWearable` with the actual signal — the shape of
 * the function does not need to change.
 */
export function recoveryScore(input: {
  adherence: number;      // 0..1 completions against expected
  hasWearable: boolean;
  recentRpe: number;      // 1..10, lower is easier
  streak: number;         // consecutive days
}): number {
  const { adherence, hasWearable, recentRpe, streak } = input;
  return Math.round(
    clamp(
      56 + adherence * 22 + (hasWearable ? 8 : 0) + (10 - recentRpe) * 1.6 + streak * 0.7,
      30, 99,
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

/** The three tightest groups, for "priority areas today". */
export function priorityAreas(ms: Measurement[], n = 3) {
  return [...ms]
    .map((m) => ({ ...m, pct: m.degrees / m.target }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, n);
}
