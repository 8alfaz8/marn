import { flexibilityScore, mobilityScore, recoveryScore, consistencyScore, priorityAreas } from '../lib/scoring';

/* Plain-assertion checks for lib/scoring.ts, run via `npx tsx
   scripts/test-scoring.ts` — matches scripts/test-scheduling.ts's pattern.
   No database access in lib/scoring.ts, so no fixtures needed beyond plain
   objects (blueprint §5.4: "no database and no UI imports"). */

let failures = 0;

function check(label: string, condition: boolean) {
  if (!condition) {
    failures++;
    console.error(`FAIL: ${label}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

// flexibilityScore
check('flexibilityScore is 0 with no measurements', flexibilityScore([]) === 0);
check(
  'flexibilityScore is 100 when every group is exactly at target',
  flexibilityScore([{ muscleKey: 'hamstrings', degrees: 90, target: 90 }]) === 100,
);
check(
  'flexibilityScore averages across groups',
  flexibilityScore([
    { muscleKey: 'hamstrings', degrees: 90, target: 90 }, // 100%
    { muscleKey: 'calves', degrees: 10, target: 20 }, // 50%
  ]) === 75,
);

// mobilityScore
check('mobilityScore is 0 with no measurements', mobilityScore([]) === 0);
check(
  'mobilityScore ignores groups outside the weighted set',
  mobilityScore([{ muscleKey: 'glutes', degrees: 15, target: 30 }]) === 0,
);
check(
  'mobilityScore is 100 when every weighted group is exactly at target',
  mobilityScore([
    { muscleKey: 'thoracic', degrees: 45, target: 45 },
    { muscleKey: 'hip_flexors', degrees: 20, target: 20 },
    { muscleKey: 'shoulders', degrees: 180, target: 180 },
    { muscleKey: 'calves', degrees: 20, target: 20 },
  ]) === 100,
);

// recoveryScore
check(
  'recoveryScore stays within its clamped range',
  (() => {
    const s = recoveryScore({ adherence: 1, hasWearable: true, recentRpe: 1, streak: 100 });
    return s <= 99;
  })(),
);
check(
  'recoveryScore never drops below its floor',
  (() => {
    const s = recoveryScore({ adherence: 0, hasWearable: false, recentRpe: 10, streak: 0 });
    return s >= 30;
  })(),
);
check(
  'recoveryScore rewards lower recent effort',
  recoveryScore({ adherence: 0, hasWearable: false, recentRpe: 2, streak: 0 }) >
    recoveryScore({ adherence: 0, hasWearable: false, recentRpe: 9, streak: 0 }),
);

// priorityAreas
check('priorityAreas returns the tightest groups first', (() => {
  const areas = priorityAreas([
    { muscleKey: 'a', degrees: 45, target: 90 }, // 50%
    { muscleKey: 'b', degrees: 90, target: 90 }, // 100%
    { muscleKey: 'c', degrees: 9, target: 90 }, // 10%
  ]);
  return areas[0].muscleKey === 'c' && areas[1].muscleKey === 'a' && areas[2].muscleKey === 'b';
})());
check('priorityAreas respects the requested count', priorityAreas([
  { muscleKey: 'a', degrees: 45, target: 90 },
  { muscleKey: 'b', degrees: 90, target: 90 },
  { muscleKey: 'c', degrees: 9, target: 90 },
], 2).length === 2);

// consistencyScore
check('consistencyScore is 0 with no programme (cadence 0)', consistencyScore({ completions: [], cadencePerWeek: 0 }) === 0);
check(
  'consistencyScore is 100 when completions exactly meet cadence over 28 days',
  (() => {
    const asOf = new Date('2026-08-12');
    // cadence 4/week over 4 weeks = 16 expected; 16 completions in-window
    const completions = Array.from({ length: 16 }, (_, i) => {
      const d = new Date(asOf);
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    });
    return consistencyScore({ completions, cadencePerWeek: 4, asOf }) === 100;
  })(),
);
check(
  'consistencyScore ignores completions outside the 28-day window',
  (() => {
    const asOf = new Date('2026-08-12');
    const old = new Date(asOf);
    old.setDate(old.getDate() - 40);
    return consistencyScore({ completions: [old.toISOString().slice(0, 10)], cadencePerWeek: 4, asOf }) === 0;
  })(),
);
check(
  'consistencyScore clamps at 100 even with more completions than expected',
  (() => {
    const asOf = new Date('2026-08-12');
    const completions = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(asOf);
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    });
    return consistencyScore({ completions, cadencePerWeek: 2, asOf }) === 100;
  })(),
);

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
} else {
  console.log('\nAll scoring checks passed.');
}
