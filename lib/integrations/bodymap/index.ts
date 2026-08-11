import { MUSCLES } from '@/lib/reference';

/* ---------------------------------------------------------------------------
   BodyMap anti-corruption layer (Iron Rule: "One port, three adapters —
   device API, file export, manual entry. No BodyMap-shaped type, field
   name, or unit assumption escapes this file into domain code. Domain code
   must compile and pass tests with the manual-entry adapter alone.")

   Independently written for the root product, not a port of
   prototype/lib/adapters/bodymap.ts (docs/adr/0005: the prototype's
   shortcuts aren't assumed reusable) — the difference that matters here is
   that every measurement below carries its own provenance fields, which the
   prototype's adapter never had to produce.
--------------------------------------------------------------------------- */

export type NormalisedMeasurement = {
  muscleKey: string;
  degrees: number;
  target: number;
};

export type NormalisedAssessment = {
  source: 'bodymap' | 'coach_manual' | 'member_report';
  instrument: string;
  protocolVersion: string;
  deviceId: string | null;
  measurements: NormalisedMeasurement[];
};

const PROTOCOL_VERSION = 'v1';

/** Drops anything not in the reference muscle list rather than guessing. */
function coerce(raw: { key: string; value: number }[]): NormalisedMeasurement[] {
  const out: NormalisedMeasurement[] = [];
  for (const r of raw) {
    const m = MUSCLES.find((x) => x.key === r.key);
    if (!m) continue;
    out.push({ muscleKey: m.key, degrees: Math.max(0, Math.round(r.value)), target: m.target });
  }
  return out;
}

/** Coach-typed values during or after a session. Always available, including offline. */
export function fromManualEntry(raw: { key: string; value: number }[]): NormalisedAssessment {
  return {
    source: 'coach_manual',
    instrument: 'manual-entry',
    protocolVersion: PROTOCOL_VERSION,
    deviceId: null,
    measurements: coerce(raw),
  };
}

/** Not implemented — awaiting the vendor's API contract (matches the prototype's own stub). */
export function fromDeviceApi(_payload: unknown): NormalisedAssessment {
  throw new Error('BodyMap device API adapter not implemented — awaiting vendor contract');
}

/** Not implemented — awaiting a real export sample. */
export function fromExportFile(_text: string): NormalisedAssessment {
  throw new Error('BodyMap file adapter not implemented — awaiting a sample export');
}
