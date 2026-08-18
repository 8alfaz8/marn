import 'dotenv/config';
import { db, schema } from './index';
import { MUSCLES, SITES, service, iso, addDays, clamp } from '../lib/reference';
import { computeScores } from '../lib/scoring';

const {
  managers, coaches, members, flags, assessments, measurements, bookings, sessions, programs, checkins,
  scoreDays, shifts,
} = schema;

/* ---------------------------------------------------------------------------
   Seeds three studios' worth of demo data: one manager, four coaches and
   fifty members per site (`SITES` in lib/reference.ts), all displayed as
   "Test User (###)" — a single global sequence across managers, coaches and
   members so every seeded person has a unique, obviously-fake name.

   Members are split into three tiers per site so the range of member
   journeys (empty state, steady progress, long-tenure power user) is real
   at every site, not just at s1:

     new    (8/site)  — joined this week, nothing captured yet.
     active (32/site) — weeks to months in, steady assessment/session cadence.
     power  (10/site) — the longest-tenured, wearable-linked, dense history.

   Every row this script writes carries isDemo: true (or, for tables without
   the column, is deleted first) so "Reset demo data" — POST /admin/seed,
   wired to Gate.tsx / Chrome.tsx's menu — stays a complete, safe wipe no
   matter how much activity accumulates. Run: npm run db:seed.
--------------------------------------------------------------------------- */

const T0 = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
const BASE: Record<string, number> = {
  hamstrings: 52, hip_flexors: 17, quadriceps: 85, glutes: 17, calves: 15,
  lower_back: 50, thoracic: 36, shoulders: 112, chest: 32, neck: 74,
};

const COACHES_PER_SITE = 4;
const MEMBERS_PER_SITE = { new: 8, active: 32, power: 10 } as const;

const MOVES = [
  { n: 'Couch stretch', d: '2 × 45s per side' },
  { n: '90/90 hip switch', d: '8 slow reps' },
  { n: 'Thoracic opener over roller', d: '60s' },
  { n: 'Doorway pec stretch', d: '2 × 30s per side' },
  { n: 'Wall slide', d: '10 slow reps' },
];

const SESSION_NOTES = [
  { coach: 'Full-body pass. Right hip still the limiter under load; PNF gave a clean end-range gain. Boots after.', member: 'Full session today with boots to finish. Your right hip is still the tightest link, but it moved well by the third set.' },
  { coach: 'Focused lower chain. Hamstring end-range improving session on session.', member: 'Lower body focus. Hamstrings opened up nicely — that is a run of sessions in a row with a gain.' },
  { coach: 'Left side notably tighter than right. Held 3×30s PNF each side, good end-range gain by set three.', member: 'We worked mainly on your hips today. Your left side is tighter than your right, so we spent extra time there.' },
  { coach: 'Thoracic rotation limited both directions. Boots 15 min after.', member: 'Your mid-back is the limiter on overhead reach — that is our focus for the next block.' },
  { coach: 'Shoulder end-range better than last visit. Kept load light, prioritised control over range.', member: 'Shoulders felt easier today. We kept things light and focused on control rather than pushing range.' },
  { coach: 'Calves and ankles first, then a full-body pass. Good session overall, low RPE throughout.', member: 'Ankle mobility work today, then a full pass. Should feel looser on your next run.' },
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

const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(arr: readonly T[]) => arr[randInt(0, arr.length - 1)];
const pad3 = (n: number) => String(n).padStart(3, '0');

/* The Neon HTTP driver rejects very large single INSERTs (measurements alone
   runs to several thousand rows across three studios) — batch every bulk
   insert so seeding stays robust regardless of table size. */
async function insertInBatches(table: any, rows: any[], size = 300) {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size) as any);
  }
}

async function wipe() {
  for (const t of [
    measurements, assessments, sessions, bookings, programs, checkins, flags, scoreDays, shifts,
    members, coaches, managers,
  ]) {
    await db.delete(t as any);
  }
}

export async function seed() {
  await wipe();

  /* A single running counter gives every seeded person — manager, coach or
     member, any site — a unique "Test User (###)" display name. */
  let personNo = 0;
  const nextName = () => `Test User (${pad3(++personNo)})`;

  const mgrRows: any[] = [];
  const coachRows: any[] = [];
  const shiftRows: any[] = [];
  const memberRows: any[] = [];
  const flagRows: any[] = [];
  const assessmentRows: any[] = [];
  const measurementRows: any[] = [];
  const sessionRows: any[] = [];
  const programRows: any[] = [];
  const checkinRows: any[] = [];
  const bookingRows: any[] = [];
  const scoreDayRows: any[] = [];

  const shiftDates: string[] = [];
  for (let i = -14; i <= 7; i++) {
    const d = addDays(T0, i);
    if (d.getDay() !== 0 && d.getDay() !== 6) shiftDates.push(iso(d)); // Mon–Fri
  }

  for (const site of SITES) {
    /* ---- manager ---------------------------------------------------- */
    const mgrName = nextName();
    const mgrId = `mg_${site.id}`;
    mgrRows.push({
      id: mgrId, name: mgrName,
      initials: mgrName.match(/\d+/)![0].slice(-2),
      siteId: site.id, isDemo: true,
    });

    /* ---- coaches + shifts -------------------------------------------- */
    const siteCoachIds: string[] = [];
    for (let ci = 1; ci <= COACHES_PER_SITE; ci++) {
      const name = nextName();
      const id = `c_${site.id}_${ci}`;
      siteCoachIds.push(id);
      coachRows.push({
        id, name, initials: name.match(/\d+/)![0].slice(-2),
        title: ci === 1 ? 'Lead Flexologist' : 'Flexologist', siteId: site.id, isDemo: true,
      });
      const morning = ci % 2 === 1;
      for (const d of shiftDates) {
        shiftRows.push({
          id: `sft_${id}_${d}`, coachId: id, siteId: site.id, date: d,
          startTime: morning ? '08:00' : '14:00', endTime: morning ? '16:00' : '22:00',
          createdByManagerId: mgrId, isDemo: true,
        });
      }
    }

    /* ---- members ------------------------------------------------------ */
    let memberSeq = 0;
    const addMember = (tier: 'new' | 'active' | 'power') => {
      memberSeq++;
      const name = nextName();
      const id = `m_${site.id}_${memberSeq}`;
      const coachId = siteCoachIds[memberSeq % siteCoachIds.length];

      const tenureDays = tier === 'new' ? randInt(0, 12) : tier === 'active' ? randInt(30, 160) : randInt(180, 320);
      const joinedAt = iso(addDays(T0, -tenureDays));
      const parqCleared = tier === 'new' ? Math.random() < 0.4 : true;
      const wearable = tier === 'power' && Math.random() < 0.7 ? 'whoop' : null;
      const streak = tier === 'power' ? randInt(10, 45) : tier === 'active' ? randInt(0, 10) : 0;

      memberRows.push({
        id, name, phone: `+971 5${randInt(0, 9)} ${randInt(100, 999)} ${randInt(1000, 9999)}`,
        goal: pick(['Undo the desk hunch, get overhead reach back', 'Lower back stiffness after long drives', 'Run without hip pain', 'Recover faster between training sessions', 'Get overhead reach back for swimming', 'Loosen up after a desk job']),
        persona: tier, joinedAt, siteId: site.id, credits: randInt(0, 12), streak, wearable,
        parqCleared, parqAt: parqCleared ? joinedAt : null, isDemo: true,
      });

      if (!parqCleared) {
        flagRows.push({ id: `fl_${id}_parq`, memberId: id, text: 'PAR-Q not completed. Screen before first session.', since: joinedAt });
      }
      if (tier !== 'new' && Math.random() < 0.15) {
        flagRows.push({
          id: `fl_${id}_safety`, memberId: id,
          text: pick(['Right shoulder impingement — avoid end-range overhead loading.', 'Lower back flare-up last month — avoid deep flexion under load.', 'Recent ankle sprain — go easy on calf end-range.']),
          since: iso(addDays(T0, -randInt(5, Math.min(tenureDays, 90)))),
        });
      }

      if (tier === 'new') return; // genuinely empty state — no assessments/sessions yet

      const assessmentCount = tier === 'active' ? randInt(3, 7) : randInt(8, 14);
      const curveEnd = tier === 'active' ? 0.15 + Math.random() * 0.15 : 0.4 + Math.random() * 0.3;
      const memberAs: any[] = [];
      for (let i = 0; i < assessmentCount; i++) {
        const t = i / Math.max(assessmentCount - 1, 1);
        const gain = curveEnd * t;
        const day = iso(addDays(T0, -Math.round(tenureDays * (1 - t))));
        const asId = `as_${id}_${i}`;
        memberAs.push({
          id: asId, memberId: id, coachId, capturedAt: day,
          source: i % 3 === 2 ? 'manual' : 'bodymap', deviceId: i % 3 === 2 ? null : 'BM-DXB-002',
        });
        measuresFor(gain, tier === 'power' ? 2 : 0).forEach((m) => measurementRows.push({ assessmentId: asId, memberId: id, ...m }));
      }
      assessmentRows.push(...memberAs);

      const sessionCount = tier === 'active' ? randInt(4, 12) : randInt(20, 40);
      for (let i = 0; i < sessionCount; i++) {
        const t = i / Math.max(sessionCount - 1, 1);
        const day = addDays(T0, -Math.round(tenureDays * (1 - t)) - 1);
        const notes = pick(SESSION_NOTES);
        const rpe = randInt(4, 8);
        const painBefore = randInt(2, 7);
        const painAfter = Math.max(painBefore - randInt(1, 4), 0);
        sessionRows.push({
          id: `se_${id}_${i}`, memberId: id, coachId: siteCoachIds[(memberSeq + i) % siteCoachIds.length], bookingId: null,
          completedAt: iso(day), mins: i % 4 === 0 ? 60 : 30,
          modalities: i % 4 === 0 ? ['Assisted stretch', 'PNF', 'Compression boots'] : ['Assisted stretch', 'PNF'],
          rpe, painBefore, painAfter, coachNotes: notes.coach, memberSummary: notes.member,
        });
      }

      if (Math.random() < 0.6) {
        const nMoves = randInt(3, 4);
        programRows.push({
          id: `pg_${id}`, memberId: id, coachId, title: pick(['Desk Reset — Block 2', 'Hip Series — Block 3', 'Shoulder Reset — Block 1', 'Runner’s Chain — Block 4']),
          assignedAt: iso(addDays(T0, -randInt(1, 10))),
          moves: MOVES.slice(0, nMoves),
          completions: [...Array(randInt(0, 6))].map((_, i) => iso(addDays(T0, -(i + 1)))),
        });
      }

      // Weekly score history, capped to ~12 points so the payload stays bounded.
      const weeks = Math.min(Math.floor(tenureDays / 7), 12);
      for (let w = weeks; w >= 0; w--) {
        const t = 1 - w / Math.max(weeks, 1);
        const sc = computeScores({
          measurements: measuresFor(curveEnd * t, tier === 'power' ? 2 : 0),
          adherence: 0.4 + t * 0.5, hasWearable: !!wearable, recentRpe: 6, streak: Math.round(streak * t),
        });
        scoreDayRows.push({ id: `sd_${id}_${w}`, memberId: id, date: iso(addDays(T0, -w * 7)), ...sc });
      }

      // One upcoming confirmed booking during the assigned coach's shift, plus
      // an occasional unassigned request so the inbox isn't ever empty.
      if (Math.random() < 0.7) {
        const svc = pick(['st30', 'st60', 'cb30', 'ox20']);
        const sv = service(svc)!;
        const daysOut = randInt(0, 6);
        const morning = siteCoachIds.indexOf(coachId) % 2 === 0;
        const time = morning ? pick(['08:00', '09:00', '10:30']) : pick(['14:30', '16:00', '18:00']);
        bookingRows.push({
          id: `bk_${id}_1`, memberId: id, coachId, siteId: site.id, serviceId: sv.id,
          date: iso(addDays(T0, daysOut)), time, status: daysOut === 0 ? 'confirmed' : pick(['confirmed', 'confirmed', 'requested']),
          addons: [], aed: sv.aed,
        });
      }
    };

    for (let i = 0; i < MEMBERS_PER_SITE.new; i++) addMember('new');
    for (let i = 0; i < MEMBERS_PER_SITE.active; i++) addMember('active');
    for (let i = 0; i < MEMBERS_PER_SITE.power; i++) addMember('power');

    // A couple of studio-wide unassigned requests, independent of any one
    // member's own booking, so the manager/coach inbox has real volume.
    const parqedMembers = memberRows.filter((m) => m.siteId === site.id && m.parqCleared);
    for (let i = 0; i < 3; i++) {
      const m = pick(parqedMembers);
      const svc = pick(['st30', 'st60', 'cb30', 'ox20']);
      const sv = service(svc)!;
      bookingRows.push({
        id: `bk_req_${site.id}_${i}`, memberId: m.id, coachId: null, siteId: site.id, serviceId: sv.id,
        date: iso(addDays(T0, randInt(1, 5))), time: pick(['09:00', '11:30', '15:00', '17:30']),
        status: 'requested', addons: [], aed: sv.aed,
      });
    }

    // A handful of pre-session check-ins dated today, for the coach/manager floor view.
    const checkinCandidates = memberRows.filter((m) => m.siteId === site.id && m.persona !== 'new');
    for (let i = 0; i < Math.min(4, checkinCandidates.length); i++) {
      const m = pick(checkinCandidates);
      checkinRows.push({
        id: `ck_${site.id}_${i}`, memberId: m.id, sleep: randInt(2, 5), pain: randInt(1, 7),
        areas: [pick(['lower back', 'right hip', 'left shoulder', 'neck', 'hamstrings'])],
        note: pick(['Long day yesterday, a bit stiff.', 'Slept badly, feeling tight.', 'Ran yesterday, hip is stiff.', null]),
      });
    }
  }

  await insertInBatches(managers, mgrRows);
  await insertInBatches(coaches, coachRows);
  await insertInBatches(shifts, shiftRows);
  await insertInBatches(members, memberRows);
  await insertInBatches(flags, flagRows);
  await insertInBatches(assessments, assessmentRows);
  await insertInBatches(measurements, measurementRows);
  await insertInBatches(sessions, sessionRows);
  await insertInBatches(programs, programRows);
  await insertInBatches(checkins, checkinRows);
  await insertInBatches(bookings, bookingRows);
  await insertInBatches(scoreDays, scoreDayRows);

  return {
    sites: SITES.length, managers: mgrRows.length, coaches: coachRows.length, shifts: shiftRows.length,
    members: memberRows.length, sessions: sessionRows.length, assessments: assessmentRows.length,
    bookings: bookingRows.length,
  };
}

/* allow `npm run db:seed` */
if (process.argv[1] && process.argv[1].includes('seed')) {
  seed().then((r) => { console.log('Seeded:', r); process.exit(0); })
        .catch((e) => { console.error(e); process.exit(1); });
}
