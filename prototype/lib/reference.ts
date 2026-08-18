/* Reference data. Static for now; becomes admin-editable tables later. */
import { bands } from '@/theme/theme';

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

export type Site = { id: string; name: string; city: string };

export const SITES: Site[] = [
  { id: 's1', name: 'Marn — Business Bay', city: 'Dubai' },
  { id: 's2', name: 'Marn — Dubai Marina', city: 'Dubai' },
  { id: 's3', name: 'Marn — Abu Dhabi Corniche', city: 'Abu Dhabi' },
];
export const siteById = (id: string) => SITES.find((s) => s.id === id);

/* Studio operating hours — every site, no per-site override yet (matches
   the root product's single STUDIO_HOURS constant). Bounds both the
   time-slot picker and the manager console's overlap guard. */
export const STUDIO_HOURS = { openMinute: 8 * 60, closeMinute: 22 * 60 };

/* Self-service PAR-Q. A member answers these themselves; a red-flag answer
   blocks booking with a referral message instead of auto-clearing.

   NOTE — deliberate exception to CLAUDE.md's Iron Rule ("a PAR-Q flag gates...
   until a named person clears it... no clearing on the member's own say-so").
   Confirmed explicitly with the product owner: self-service auto-clear stays,
   to unblock new members immediately. See docs/adr/0001-parq-self-service.md. */
export type ParqQuestion = { key: string; text: string; redFlag: boolean };
export const PARQ_QUESTIONS: ParqQuestion[] = [
  { key: 'heart', text: 'Has a doctor ever said you have a heart condition and recommended only medically supervised activity?', redFlag: true },
  { key: 'chestPain', text: 'Do you feel pain in your chest during physical activity?', redFlag: true },
  { key: 'balance', text: 'Have you had chest pain, dizziness, or loss of balance in the past month?', redFlag: true },
  { key: 'bone', text: 'Do you have a bone or joint problem that could be made worse by a change in activity?', redFlag: false },
  { key: 'medication', text: 'Are you currently on medication for blood pressure or a heart condition?', redFlag: false },
  { key: 'doctorAdvised', text: 'Has a doctor ever advised you not to exercise?', redFlag: true },
  { key: 'other', text: 'Is there any other reason you should be cautious about starting an activity programme?', redFlag: false },
];

/* Status bands for a ROM measurement as a fraction of target. Legacy
   thresholds (fraction-of-target degrees) — distinct from `bandOf()` below,
   which implements the brand handoff's own thresholds on a 0-100 normalised
   range score. Kept as-is rather than reconciled: changing these thresholds
   would silently re-bucket every existing body-map/session-history colour,
   which is a behaviour change outside this pass's scope. Colours themselves
   now come from the brand's `bands` tokens (theme.ts) instead of the old
   lime/amber/clay/jade literals. */
export function statusOf(p: number) {
  return p < 0.6 ? 'restricted' : p < 0.75 ? 'limited' : p < 0.9 ? 'optimal' : 'excellent';
}
export const STATUS_COLOR: Record<string, string> = bands;
export const colorOf = (p: number) => STATUS_COLOR[statusOf(p)];

export type Band = 'restricted' | 'limited' | 'optimal' | 'excellent';

/** Brand handoff's band assignment: "< 35 Restricted, < 60 Limited, < 80
 * Optimal, >= 80 Excellent" on a joint's normalised 0-100 range score. Used
 * by the new member-app screens (Session detail, Mobility detail, Session
 * report, Progress) — kept separate from the legacy `statusOf()` above,
 * which uses different thresholds on a different scale. */
export function bandOf(score: number): Band {
  return score < 35 ? 'restricted' : score < 60 ? 'limited' : score < 80 ? 'optimal' : 'excellent';
}
export const bandColor = (score: number) => bands[bandOf(score)];
export const bandLabel = (b: Band) => b.charAt(0).toUpperCase() + b.slice(1);

/* Scopes a full snapshot down to what one coach should see: their own
   bookings plus the unassigned request inbox, and the members tied to those.
   No `sites` table exists yet, so this scopes by relationship rather than
   site. Client-side only — see docs/adr/0002-prototype-auth-gap.md; a coach
   with dev tools open could still see the raw snapshot from the network tab.
   Business aggregates (revenue, cross-coach comparisons) are simply omitted
   rather than passed through — that content now lives only in the admin
   view (components/Admin.tsx). */
export function scopeSnapshotForCoach(snap: any, coachId: string) {
  const bookings = snap.bookings.filter((b: any) => b.coachId === coachId || (b.coachId == null && b.status === 'requested'));
  const memberIds = new Set(bookings.map((b: any) => b.memberId));
  snap.members.forEach((m: any) => { if (m.id && memberIds.has(m.id)) memberIds.add(m.id); });
  // also include members this coach has directly worked with historically
  for (const key of ['sessions', 'assessments', 'programs'] as const) {
    for (const row of snap[key]) if (row.coachId === coachId) memberIds.add(row.memberId);
  }
  // and members this coach added but hasn't booked/assessed/logged yet — without
  // this a freshly-added member has no booking/session/assessment tying them to
  // the coach and disappears from their own roster right after creation.
  for (const m of snap.members) if (m.addedByCoachId === coachId) memberIds.add(m.id);
  const members = snap.members.filter((m: any) => memberIds.has(m.id));
  const inScope = (memberId: string) => memberIds.has(memberId);
  return {
    ...snap,
    bookings,
    members,
    sessions: snap.sessions.filter((s: any) => inScope(s.memberId)),
    assessments: snap.assessments.filter((a: any) => inScope(a.memberId)),
    measurements: snap.measurements.filter((x: any) => inScope(x.memberId)),
    programs: snap.programs.filter((p: any) => inScope(p.memberId)),
    checkins: snap.checkins.filter((c: any) => inScope(c.memberId)),
  };
}

/* Scopes a full snapshot down to one studio: every coach/member/booking/shift
   at that site, plus the activity rows keyed to those members. Used by the
   manager console — a manager sees their whole floor, not just people
   they've personally touched (unlike scopeSnapshotForCoach above). Client-
   side only, same caveat as the other scope helpers: see
   docs/adr/0002-prototype-auth-gap.md. */
export function scopeSnapshotForManager(snap: any, siteId: string) {
  const coaches = snap.coaches.filter((c: any) => c.siteId === siteId);
  const members = snap.members.filter((m: any) => m.siteId === siteId);
  const memberIds = new Set(members.map((m: any) => m.id));
  const inScope = (memberId: string) => memberIds.has(memberId);
  return {
    ...snap,
    coaches,
    members,
    shifts: snap.shifts.filter((s: any) => s.siteId === siteId),
    bookings: snap.bookings.filter((b: any) => b.siteId === siteId),
    sessions: snap.sessions.filter((s: any) => inScope(s.memberId)),
    assessments: snap.assessments.filter((a: any) => inScope(a.memberId)),
    measurements: snap.measurements.filter((x: any) => inScope(x.memberId)),
    programs: snap.programs.filter((p: any) => inScope(p.memberId)),
    checkins: snap.checkins.filter((c: any) => inScope(c.memberId)),
  };
}

/* Scopes a full snapshot down to one member: their own record plus everything
   keyed to their memberId. `coaches` stays unfiltered (small table, needed
   for coach-name lookups on bookings/sessions) and `scoreDays` is filtered
   the same way as the other member-keyed tables. Used server-side by
   GET /snapshot?scope=member — see docs/adr/0002-prototype-auth-gap.md for
   why this is a payload-size optimisation, not real authorization. */
export function scopeSnapshotForMember(snap: any, memberId: string) {
  const inScope = (id: string) => id === memberId;
  return {
    ...snap,
    members: snap.members.filter((m: any) => m.id === memberId),
    bookings: snap.bookings.filter((b: any) => inScope(b.memberId)),
    sessions: snap.sessions.filter((s: any) => inScope(s.memberId)),
    assessments: snap.assessments.filter((a: any) => inScope(a.memberId)),
    measurements: snap.measurements.filter((x: any) => inScope(x.memberId)),
    programs: snap.programs.filter((p: any) => inScope(p.memberId)),
    checkins: snap.checkins.filter((c: any) => inScope(c.memberId)),
    scoreDays: snap.scoreDays.filter((s: any) => inScope(s.memberId)),
  };
}

/* helpers shared by server and client */
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const todayIso = () => iso(new Date());
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const uid = (p: string) => p + '_' + Math.random().toString(36).slice(2, 10);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
