/* Reference data. Static for now; becomes admin-editable tables later. */

export type Muscle = {
  key: string; label: string; region: 'Lower' | 'Core' | 'Upper';
  target: number; face: 'front' | 'back'; note: string;
};

export const MUSCLES: Muscle[] = [
  { key: 'hamstrings',  label: 'Hamstrings',      region: 'Lower', target: 90,  face: 'back',  note: 'Back of thigh. Drives hip hinge, running and squatting.' },
  { key: 'hip_flexors', label: 'Hip Flexors',     region: 'Lower', target: 20,  face: 'front', note: 'Front of hip. First thing to shorten with long sitting.' },
  { key: 'quadriceps',  label: 'Quadriceps',      region: 'Lower', target: 140, face: 'front', note: 'Front of thigh. Knee extension and landing control.' },
  { key: 'glutes',      label: 'Glutes',          region: 'Lower', target: 30,  face: 'back',  note: 'Hip extension and lateral stability.' },
  { key: 'calves',      label: 'Calves',          region: 'Lower', target: 20,  face: 'back',  note: 'Ankle dorsiflexion. Limits squat depth and gait.' },
  { key: 'lower_back',  label: 'Lower Back',      region: 'Core',  target: 60,  face: 'back',  note: 'Lumbar flexion and rotation tolerance.' },
  { key: 'thoracic',    label: 'Thoracic Spine',  region: 'Core',  target: 45,  face: 'back',  note: 'Mid-back rotation. Governs overhead reach.' },
  { key: 'shoulders',   label: 'Shoulders',       region: 'Upper', target: 180, face: 'front', note: 'Overhead flexion arc.' },
  { key: 'chest',       label: 'Chest (Pecs)',    region: 'Upper', target: 45,  face: 'front', note: 'Horizontal abduction. Opens desk posture.' },
  { key: 'neck',        label: 'Neck',            region: 'Upper', target: 80,  face: 'front', note: 'Cervical rotation each side.' },
];

export const muscle = (k: string) => MUSCLES.find((m) => m.key === k)!;

export type Service = { id: string; name: string; mins: number; aed: number; desc: string };

export const SERVICES: Service[] = [
  { id: 'st30', name: 'Assisted Stretch',        mins: 30, aed: 100, desc: 'One-to-one coach-led stretch. Our base session.' },
  { id: 'st60', name: 'Assisted Stretch — Long', mins: 60, aed: 190, desc: 'Full-body pass with deeper holds and a re-test at the end.' },
  { id: 'cb30', name: 'Compression Recovery',    mins: 30, aed:  90, desc: 'Compression boots for legs. Best straight after training.' },
  { id: 'ox20', name: 'Oxygen Reset',            mins: 20, aed:  80, desc: 'Seated oxygen session. Pairs well with a stretch.' },
];
export const service = (id: string) => SERVICES.find((s) => s.id === id)!;

export const ADDONS = [
  { id: 'hyd', name: 'Hydration',      aed: 35 },
  { id: 'nut', name: 'Nutrition shot', aed: 25 },
];
export const addon = (id: string) => ADDONS.find((a) => a.id === id)!;

export const MODALITIES = [
  'Assisted stretch', 'PNF', 'Compression boots', 'Oxygen', 'Trigger point', 'Hydration',
];

export const SITE = { id: 's1', name: 'Marn — Business Bay' };

export const PERSONAS = [
  { id: 'power',  label: 'Power user',  blurb: 'Nine months in. 48 sessions, wearable linked, the graph tells a story.' },
  { id: 'active', label: 'Regular',     blurb: 'Four months in. Steady progress, one open safety flag.' },
  { id: 'new',    label: 'Brand new',   blurb: 'Signed up, never assessed. This is the empty state.' },
];

/* Status bands for a ROM measurement as a fraction of target. */
export function statusOf(p: number) {
  return p < 0.6 ? 'restricted' : p < 0.75 ? 'limited' : p < 0.9 ? 'optimal' : 'excellent';
}
export const STATUS_COLOR: Record<string, string> = {
  restricted: '#D2532A', limited: '#E0A33C', optimal: '#A9E34B', excellent: '#43B07C',
};
export const colorOf = (p: number) => STATUS_COLOR[statusOf(p)];

/* helpers shared by server and client */
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const todayIso = () => iso(new Date());
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const uid = (p: string) => p + '_' + Math.random().toString(36).slice(2, 10);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
