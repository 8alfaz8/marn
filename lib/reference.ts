/* Static reference data for the Phase 1 staff-side slice. Services/pricing
   become admin-editable tables when Administration (blueprint §4.4, P2/P3)
   is built — matching the prototype's own documented placeholder for the
   same reason (docs/architecture/overview.md, Administration deviations). */

export type MuscleGroup = { key: string; label: string; target: number; region: 'Lower' | 'Core' | 'Upper' };

/* Ten joint angles per blueprint §5.2 ("Ten per assessment today; the
   schema does not care if it becomes thirty"). Target degrees are working
   figures, not clinically sourced norms — blueprint §5.2 flags age/sex
   adjustment as OPEN. `region` matches the blueprint §5.3 table; the member
   portal groups by it as this pass's "body map" (a region-grouped bar list,
   not an anatomical figure — see docs/decisions.md). */
export const MUSCLES: MuscleGroup[] = [
  { key: 'hamstrings', label: 'Hamstrings', target: 90, region: 'Lower' },
  { key: 'hip_flexors', label: 'Hip Flexors', target: 20, region: 'Lower' },
  { key: 'quadriceps', label: 'Quadriceps', target: 140, region: 'Lower' },
  { key: 'glutes', label: 'Glutes', target: 30, region: 'Lower' },
  { key: 'calves', label: 'Calves', target: 20, region: 'Lower' },
  { key: 'lower_back', label: 'Lower Back', target: 60, region: 'Core' },
  { key: 'thoracic', label: 'Thoracic Spine', target: 45, region: 'Core' },
  { key: 'shoulders', label: 'Shoulders', target: 180, region: 'Upper' },
  { key: 'chest', label: 'Chest', target: 45, region: 'Upper' },
  { key: 'neck', label: 'Neck', target: 80, region: 'Upper' },
];

export const muscleByKey = (key: string) => MUSCLES.find((m) => m.key === key);

export type Service = { id: string; name: string; mins: number; aed: number };

/* Blueprint §1.4 service model. */
export const SERVICES: Service[] = [
  { id: 'st30', name: 'Assisted Stretch', mins: 30, aed: 100 },
  { id: 'st60', name: 'Assisted Stretch — Long', mins: 60, aed: 190 },
  { id: 'cb30', name: 'Compression Recovery', mins: 30, aed: 90 },
  { id: 'ox20', name: 'Oxygen Reset', mins: 20, aed: 80 },
];

export const serviceById = (id: string) => SERVICES.find((s) => s.id === id);

/* Studio operating hours — every site, no per-site override yet. Bounds
   both the booking slot picker and server-side booking validation. */
export const STUDIO_HOURS = { openMinute: 8 * 60, closeMinute: 22 * 60 };

/* PAR-Q-derived readiness screening (blueprint §4.1.10) — "referral gate,
   not a liability form" (§1.4). `redFlag: true` means answering `true` to
   this question means the member is not cleared and sees a referral
   message; there is no workaround path (Iron Rule: safety flags route to a
   human, no clearing on the member's own say-so). Modeled on the seven
   questions the prototype's self-service form asked (docs/adr/0001), now
   coach-administered instead of self-service. */
export type ParqQuestion = { key: string; text: string; redFlag: boolean };

export const PARQ_QUESTIONS: ParqQuestion[] = [
  { key: 'heart_condition', text: 'Has a doctor ever said you have a heart condition and recommended only physical activity approved by a doctor?', redFlag: true },
  { key: 'chest_pain_activity', text: 'Do you feel pain in your chest when you do physical activity?', redFlag: true },
  { key: 'chest_pain_rest', text: 'In the past month, have you had chest pain when you were not doing physical activity?', redFlag: true },
  { key: 'balance_dizziness', text: 'Do you lose your balance because of dizziness or do you ever lose consciousness?', redFlag: true },
  { key: 'bone_joint_problem', text: 'Do you have a bone or joint problem that could be worsened by a change in physical activity?', redFlag: false },
  { key: 'blood_pressure_meds', text: 'Is a doctor currently prescribing medication for your blood pressure or a heart condition?', redFlag: false },
  { key: 'doctor_advised_against', text: 'Has a doctor ever advised you not to exercise, or to only exercise under supervision?', redFlag: true },
];
