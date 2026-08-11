/* Static reference data for the Phase 1 staff-side slice. Services/pricing
   become admin-editable tables when Administration (blueprint §4.4, P2/P3)
   is built — matching the prototype's own documented placeholder for the
   same reason (docs/architecture/overview.md, Administration deviations). */

export type MuscleGroup = { key: string; label: string; target: number };

/* Ten joint angles per blueprint §5.2 ("Ten per assessment today; the
   schema does not care if it becomes thirty"). Target degrees are working
   figures, not clinically sourced norms — blueprint §5.2 flags age/sex
   adjustment as OPEN. */
export const MUSCLES: MuscleGroup[] = [
  { key: 'hamstrings', label: 'Hamstrings', target: 90 },
  { key: 'hip_flexors', label: 'Hip Flexors', target: 20 },
  { key: 'quadriceps', label: 'Quadriceps', target: 140 },
  { key: 'glutes', label: 'Glutes', target: 30 },
  { key: 'calves', label: 'Calves', target: 20 },
  { key: 'lower_back', label: 'Lower Back', target: 60 },
  { key: 'thoracic', label: 'Thoracic Spine', target: 45 },
  { key: 'shoulders', label: 'Shoulders', target: 180 },
  { key: 'chest', label: 'Chest', target: 45 },
  { key: 'neck', label: 'Neck', target: 80 },
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
