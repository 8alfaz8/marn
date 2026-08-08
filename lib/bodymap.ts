import { MUSCLES, clamp } from './reference';

/* ---------------------------------------------------------------------------
   BodyMap anti-corruption layer.

   BodyMap is a third-party measurement device. We do not know its integration
   surface yet, so nothing in this codebase depends on its data format. Every
   route in and out of it lands on ONE canonical shape: NormalisedMeasurement[].

   Three adapters are planned. Only `simulated` is implemented today; the other
   two are stubs with the signature already fixed so the call sites do not move
   when the real device arrives.

     1. fromDeviceApi(payload)  — if the vendor exposes REST/webhooks
     2. fromExportFile(text)    — CSV/JSON dropped by a studio-side agent
     3. manual entry            — coach types numbers in the dashboard
                                  (always supported; it is the pilot path and
                                   the fallback when a pod site is offline)

   If the vendor changes, or we buy a second device, only this file changes.
--------------------------------------------------------------------------- */

export type NormalisedMeasurement = {
  muscleKey: string;
  degrees: number;
  target: number;
};

export type NormalisedAssessment = {
  source: 'bodymap' | 'manual';
  deviceId: string | null;
  measurements: NormalisedMeasurement[];
};

/** Drops anything we do not recognise rather than guessing. */
function coerce(raw: { key: string; value: number }[]): NormalisedMeasurement[] {
  const out: NormalisedMeasurement[] = [];
  for (const r of raw) {
    const m = MUSCLES.find((x) => x.key === r.key);
    if (!m) continue; // unknown group — ignore, do not invent
    out.push({ muscleKey: m.key, degrees: Math.round(clamp(r.value, 0, m.target)), target: m.target });
  }
  return out;
}

/** TODO: implement when the vendor's API contract is known. */
export function fromDeviceApi(_payload: unknown): NormalisedAssessment {
  throw new Error('BodyMap device API adapter not implemented — awaiting vendor contract');
}

/** TODO: implement against a real export sample. Expected: key,value per row. */
export function fromExportFile(_text: string): NormalisedAssessment {
  throw new Error('BodyMap file adapter not implemented — awaiting a sample export');
}

/** Coach-typed values. Always available, including offline. */
export function fromManualEntry(raw: { key: string; value: number }[]): NormalisedAssessment {
  return { source: 'manual', deviceId: null, measurements: coerce(raw) };
}

/**
 * Demo only. Produces a plausible next reading from the previous one so the
 * prototype can show an ingestion landing without a device present.
 * Delete this the day a real adapter works.
 */
export function simulateDeviceRead(previous: NormalisedMeasurement[] | null): NormalisedAssessment {
  const measurements = MUSCLES.map((m) => {
    const prev = previous?.find((p) => p.muscleKey === m.key)?.degrees ?? Math.round(m.target * 0.6);
    return {
      muscleKey: m.key,
      degrees: Math.round(clamp(prev + 1 + Math.random() * 4, 0, m.target)),
      target: m.target,
    };
  });
  return { source: 'bodymap', deviceId: 'BM-DXB-002', measurements };
}
