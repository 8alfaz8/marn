import 'dotenv/config';
import { db, schema } from './index';
import { MUSCLES, service, addon, iso, addDays, clamp } from '../lib/reference';
import { computeScores } from '../lib/scoring';

const { coaches, members, flags, assessments, measurements, bookings, sessions, programs, checkins, scoreDays } = schema;

/* ---------------------------------------------------------------------------
   Seeds three personas whose data shapes differ enough to be worth looking at:

     Layla  — power user, 9 months, 48 sessions, wearable linked. The graph has
              a real story: big early gains, a plateau, then a second climb.
     Amira  — regular, 4 months, steady, one open safety flag.
     Tom    — brand new. No assessment, no sessions, PAR-Q outstanding.
              This is the empty state, and it is the one people forget to design.

   Run: npm run db:seed   (safe to re-run — wipes demo rows first)
--------------------------------------------------------------------------- */

const T0 = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const BASE: Record<string, number> = {
  hamstrings: 52, hip_flexors: 17, quadriceps: 85, glutes: 17, calves: 15,
  lower_back: 50, thoracic: 36, shoulders: 112, chest: 32, neck: 74,
};

const COACHES = [
  { id: 'c1', name: 'Sara Haddad',   initials: 'SH', title: 'Lead Flexologist' },
  { id: 'c2', name: 'Omar Nasser',   initials: 'ON', title: 'Flexologist' },
  { id: 'c3', name: 'Lina Farouk',   initials: 'LF', title: 'Flexologist' },
];

const MOVES = [
  { n: 'Couch stretch', d: '2 × 45s per side' },
  { n: '90/90 hip switch', d: '8 slow reps' },
  { n: 'Thoracic opener over roller', d: '60s' },
  { n: 'Doorway pec stretch', d: '2 × 30s per side' },
];

function measuresFor(gainFactor: number, offset = 0) {
  return MUSCLES.map((m) => {
    const start = BASE[m.key] + offset;
    const room = m.target - start;
    return {
      muscleKey: m.key,
      degrees: Math.round(clamp(start + room * gainFactor, 0, m.target)),
      target: m.target,
    };
  });
}

async function wipe() {
  for (const t of [measurements, assessments, sessions, bookings, programs, checkins, flags, scoreDays, members, coaches]) {
    await db.delete(t as any);
  }
}

export async function seed() {
  await wipe();
  await db.insert(coaches).values(COACHES.map((c) => ({ ...c, siteId: 's1', isDemo: true })) as any);

  /* ---- members ---------------------------------------------------------- */
  await db.insert(members).values([
    { id: 'm_layla', name: 'Layla Mansour', phone: '+971 50 441 8802', goal: 'Run a sub-2h half marathon without hip pain',
      persona: 'power', joinedAt: iso(addDays(T0, -274)), credits: 14, streak: 41, wearable: 'whoop',
      parqCleared: true, parqAt: iso(addDays(T0, -274)), isDemo: true },
    { id: 'm_amira', name: 'Amira Khalid', phone: '+971 50 218 4471', goal: 'Undo the desk hunch, get overhead reach back',
      persona: 'active', joinedAt: iso(addDays(T0, -119)), credits: 6, streak: 5, wearable: null,
      parqCleared: true, parqAt: iso(addDays(T0, -119)), isDemo: true },
    { id: 'm_tom', name: 'Tom Whitfield', phone: '+971 56 771 2094', goal: 'Lower back stiffness after long drives',
      persona: 'new', joinedAt: iso(T0), credits: 0, streak: 0, wearable: null,
      parqCleared: false, parqAt: null, isDemo: true },
  ] as any);

  await db.insert(flags).values([
    { id: 'fl_1', memberId: 'm_amira', text: 'Right shoulder impingement — avoid end-range overhead loading.', since: iso(addDays(T0, -56)) },
    { id: 'fl_2', memberId: 'm_tom', text: 'PAR-Q not completed. Screen before first session.', since: iso(T0) },
  ] as any);

  /* ---- assessments ------------------------------------------------------ */
  // Layla: 12 assessments over 9 months. Fast gains, plateau, second climb.
  const laylaCurve = [0, .10, .19, .27, .33, .36, .37, .37, .38, .46, .55, .62];
  const laylaAs: any[] = [], laylaMs: any[] = [];
  laylaCurve.forEach((g, i) => {
    const id = `as_layla_${i}`;
    const day = iso(addDays(T0, -(274 - i * 24)));
    laylaAs.push({ id, memberId: 'm_layla', coachId: COACHES[i % 3].id, capturedAt: day,
      source: i % 3 === 2 ? 'manual' : 'bodymap', deviceId: i % 3 === 2 ? null : 'BM-DXB-002' });
    measuresFor(g, 2).forEach((m) => laylaMs.push({ assessmentId: id, memberId: 'm_layla', ...m }));
  });

  // Amira: 5 assessments over 4 months, modest steady gains.
  const amiraCurve = [0, .06, .11, .15, .18];
  const amiraAs: any[] = [], amiraMs: any[] = [];
  amiraCurve.forEach((g, i) => {
    const id = `as_amira_${i}`;
    const day = iso(addDays(T0, -(119 - i * 27)));
    amiraAs.push({ id, memberId: 'm_amira', coachId: COACHES[i % 3].id, capturedAt: day,
      source: i === 4 ? 'bodymap' : 'manual', deviceId: i === 4 ? 'BM-DXB-002' : null });
    measuresFor(g).forEach((m) => amiraMs.push({ assessmentId: id, memberId: 'm_amira', ...m }));
  });

  await db.insert(assessments).values([...laylaAs, ...amiraAs] as any);
  await db.insert(measurements).values([...laylaMs, ...amiraMs] as any);

  /* ---- sessions --------------------------------------------------------- */
  const sess: any[] = [];
  for (let i = 0; i < 48; i++) {
    const day = addDays(T0, -(266 - i * 5.5));
    const rpe = 5 + (i % 4 === 0 ? 2 : i % 3 === 0 ? 1 : 0);
    const pb = 6 - Math.floor(i / 14);
    sess.push({
      id: `se_layla_${i}`, memberId: 'm_layla', coachId: COACHES[i % 3].id, bookingId: null,
      completedAt: iso(day), mins: i % 4 === 0 ? 60 : 30,
      modalities: i % 4 === 0 ? ['Assisted stretch', 'PNF', 'Compression boots'] : ['Assisted stretch', 'PNF'],
      rpe, painBefore: Math.max(pb, 1), painAfter: Math.max(pb - 3, 0),
      coachNotes: i % 4 === 0
        ? 'Full-body pass. Right hip still the limiter under load; PNF gave a clean 6° at end range. Boots 15 min after.'
        : 'Focused lower chain. Hamstring end-range improving session on session.',
      memberSummary: i % 4 === 0
        ? 'Full session today with boots to finish. Your right hip is still the tightest link, but it moved well by the third set. Keep the 90/90 work going.'
        : 'Lower body focus. Hamstrings opened up nicely — that is the third session in a row with a gain.',
    });
  }
  sess.push(
    { id: 'se_amira_1', memberId: 'm_amira', coachId: 'c1', bookingId: null, completedAt: iso(addDays(T0, -4)),
      mins: 30, modalities: ['Assisted stretch', 'PNF'], rpe: 6, painBefore: 5, painAfter: 2,
      coachNotes: 'Left hamstring notably tighter than right. Held 3×30s PNF each side, good end-range gain by set three. Watch the right shoulder on overhead work.',
      memberSummary: 'We worked mainly on your hamstrings and hips today. Your left side is tighter than your right, so we spent extra time there. Keep the couch stretch going twice a day and we should see the gap close by your next re-test.' },
    { id: 'se_amira_2', memberId: 'm_amira', coachId: 'c3', bookingId: null, completedAt: iso(addDays(T0, -11)),
      mins: 60, modalities: ['Assisted stretch', 'Compression boots'], rpe: 7, painBefore: 6, painAfter: 3,
      coachNotes: 'Full-body pass. Thoracic rotation limited both directions. Boots 15 min after.',
      memberSummary: 'Full-body session with compression boots to finish. Your mid-back is the limiter on overhead reach — that is our focus for the next block.' },
  );
  await db.insert(sessions).values(sess as any);

  /* ---- programmes ------------------------------------------------------- */
  await db.insert(programs).values([
    { id: 'pg_layla', memberId: 'm_layla', coachId: 'c1', title: 'Hip Series — Block 7', assignedAt: iso(addDays(T0, -9)),
      moves: MOVES, completions: [...Array(6)].map((_, i) => iso(addDays(T0, -(i + 1)))) },
    { id: 'pg_amira', memberId: 'm_amira', coachId: 'c1', title: 'Desk Reset — Block 2', assignedAt: iso(addDays(T0, -4)),
      moves: MOVES.slice(0, 3), completions: [iso(addDays(T0, -3)), iso(addDays(T0, -2))] },
  ] as any);

  /* ---- bookings --------------------------------------------------------- */
  const bk = (id: string, memberId: string, coachId: string | null, sid: string, d: Date, time: string, status: string, addons: string[] = []) => ({
    id, memberId, coachId, serviceId: sid, date: iso(d), time, status, addons,
    aed: service(sid).aed + addons.reduce((s, a) => s + addon(a).aed, 0),
  });
  await db.insert(bookings).values([
    bk('bk_1', 'm_layla', 'c1', 'st60', T0, '09:00', 'confirmed', ['hyd']),
    bk('bk_2', 'm_amira', null, 'st30', T0, '11:30', 'requested'),
    bk('bk_3', 'm_layla', 'c2', 'cb30', addDays(T0, 2), '18:00', 'confirmed'),
    bk('bk_4', 'm_amira', 'c1', 'st30', addDays(T0, 1), '18:00', 'confirmed'),
  ] as any);

  await db.insert(checkins).values([
    { id: 'ck_1', memberId: 'm_layla', sleep: 4, pain: 3, areas: ['right hip'], note: 'Long run yesterday, hip is stiff.' },
  ] as any);

  /* ---- score history ---------------------------------------------------- */
  const rows: any[] = [];
  const addSeries = (memberId: string, days: number, curve: (t: number) => number, wearable: boolean, streak: number) => {
    for (let i = days - 1; i >= 0; i--) {
      const t = (days - 1 - i) / (days - 1);
      const ms = measuresFor(curve(t), memberId === 'm_layla' ? 2 : 0);
      const sc = computeScores({
        measurements: ms, adherence: 0.4 + t * 0.5, hasWearable: wearable,
        recentRpe: 6 - Math.round(t), streak: Math.round(streak * t),
      });
      rows.push({ id: `sd_${memberId}_${i}`, memberId, date: iso(addDays(T0, -i)),
        flexibility: sc.flexibility + (i % 3 === 0 ? 1 : 0),
        mobility: sc.mobility - (i % 4 === 0 ? 1 : 0),
        recovery: sc.recovery + (i % 5 === 0 ? 3 : i % 2 === 0 ? -2 : 0) });
    }
  };
  addSeries('m_layla', 90, (t) => 0.37 + t * 0.25, true, 41);
  addSeries('m_amira', 60, (t) => 0.10 + t * 0.08, false, 5);
  await db.insert(scoreDays).values(rows as any);

  return { coaches: COACHES.length, members: 3, sessions: sess.length, assessments: laylaAs.length + amiraAs.length };
}

/* allow `npm run db:seed` */
if (process.argv[1] && process.argv[1].includes('seed')) {
  seed().then((r) => { console.log('Seeded:', r); process.exit(0); })
        .catch((e) => { console.error(e); process.exit(1); });
}