import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, and, inArray, ilike, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { seed } from '@/db/seed';
import {
  MUSCLES, SERVICES, ADDONS, PARQ_QUESTIONS, SITES, service, addon, todayIso, uid, muscle,
  scopeSnapshotForCoach, scopeSnapshotForMember, scopeSnapshotForManager,
} from '@/lib/reference';
import { computeScores, priorityAreas } from '@/lib/scoring';
import { simulateDeviceRead, fromManualEntry } from '@/lib/adapters/bodymap';
import { computeFreeSlots } from '@/lib/scheduling';

export const dynamic = 'force-dynamic';

const {
  managers, coaches, members, flags, assessments, measurements, bookings, sessions, programs, checkins,
  scoreDays, shifts,
} = schema;

/* ---------------------------------------------------------------------------
   Single dispatcher for the whole API.

   Kept in one file on purpose while the contract is still moving — the entire
   surface is readable top to bottom, which is what you want when a coding agent
   or a new engineer is extending it. Split into per-resource route modules once
   the shape settles; the paths do not change when you do.
--------------------------------------------------------------------------- */

class ApiError extends Error { constructor(msg: string, public status = 400) { super(msg); } }
const bad = (m: string, s = 400) => { throw new ApiError(m, s); };

/* ---------- helpers ---------- */

async function membersWithScores() {
  const [ms, allMeas, allSess, allProg, allFlags] = await Promise.all([
    db.select().from(members),
    db.select().from(measurements),
    db.select().from(sessions).orderBy(desc(sessions.completedAt)),
    db.select().from(programs),
    db.select().from(flags),
  ]);
  const latestByMember: Record<string, string> = {};
  const asRows = await db.select().from(assessments).orderBy(desc(assessments.capturedAt));
  for (const a of asRows) if (!latestByMember[a.memberId]) latestByMember[a.memberId] = a.id;

  return ms.map((m) => {
    const meas = allMeas.filter((x) => x.assessmentId === latestByMember[m.id]);
    const prog = allProg.find((p) => p.memberId === m.id);
    const recent = allSess.find((s) => s.memberId === m.id);
    const scores = meas.length
      ? computeScores({
          measurements: meas, hasWearable: !!m.wearable, streak: m.streak,
          adherence: prog ? Math.min(prog.completions.length / 6, 1) : 0.5,
          recentRpe: recent?.rpe ?? 6,
        })
      : { flexibility: 0, mobility: 0, recovery: 0 };
    return {
      ...m,
      scores,
      flags: allFlags.filter((f) => f.memberId === m.id),
      latestAssessmentId: latestByMember[m.id] ?? null,
      sessionCount: allSess.filter((s) => s.memberId === m.id).length,
      lastSession: recent?.completedAt ?? null,
    };
  });
}

/* `scope` trims the response before it goes over the wire — Member and Coach
   both used to fetch the entire database and filter client-side on every
   5-second poll. This reuses the exact same filter functions Coach.tsx
   already applied client-side (lib/reference.ts), just earlier in the
   pipeline. Still not real authorization: the caller declares its own scope,
   nothing checks they're entitled to it — see docs/adr/0002. */
async function snapshot(scope?: { kind: 'member' | 'coach' | 'manager'; id: string }) {
  const [ms, cs, mgrs, sh, bk, se, pg, ck, sd, asRows, meas] = await Promise.all([
    membersWithScores(),
    db.select().from(coaches),
    db.select().from(managers),
    db.select().from(shifts).orderBy(shifts.date, shifts.startTime),
    db.select().from(bookings).orderBy(bookings.date, bookings.time),
    db.select().from(sessions).orderBy(desc(sessions.completedAt)),
    db.select().from(programs),
    db.select().from(checkins).orderBy(desc(checkins.at)),
    db.select().from(scoreDays).orderBy(scoreDays.date),
    db.select().from(assessments).orderBy(desc(assessments.capturedAt)),
    db.select().from(measurements),
  ]);
  const full = {
    members: ms, coaches: cs, managers: mgrs, shifts: sh, bookings: bk, sessions: se, programs: pg,
    checkins: ck, scoreDays: sd, assessments: asRows, measurements: meas, sites: SITES,
    reference: { muscles: MUSCLES, services: SERVICES, addons: ADDONS, parqQuestions: PARQ_QUESTIONS },
    serverTime: new Date().toISOString(),
  };
  if (scope?.kind === 'coach') return { ...full, ...scopeSnapshotForCoach(full, scope.id) };
  if (scope?.kind === 'member') return { ...full, ...scopeSnapshotForMember(full, scope.id) };
  if (scope?.kind === 'manager') {
    const mgr = mgrs.find((x) => x.id === scope.id);
    return mgr ? { ...full, ...scopeSnapshotForManager(full, mgr.siteId) } : full;
  }
  return full;
}

/** Lightweight roster for the landing page and the top switcher — id/name/
 * site only, none of the activity history the full snapshot carries. Keeps
 * those two surfaces fast even as the demo dataset grows (150 members). */
async function directory() {
  const [mgrs, cs, ms] = await Promise.all([
    db.select({ id: managers.id, name: managers.name, siteId: managers.siteId }).from(managers),
    db.select({ id: coaches.id, name: coaches.name, siteId: coaches.siteId, title: coaches.title }).from(coaches),
    db.select({ id: members.id, name: members.name, siteId: members.siteId }).from(members).orderBy(members.name),
  ]);
  return { sites: SITES, managers: mgrs, coaches: cs, members: ms };
}

/** Server-side paginated members list — the piece `snapshot()`/
 * `membersWithScores()` deliberately isn't used for. That path always loads
 * every member's every measurement/session/programme/flag regardless of
 * what's displayed; this one does the opposite: LIMIT/OFFSET at the
 * database for the members table itself, then only fetches related rows
 * (flags/sessions/programmes/assessments/measurements) for the ~20 member
 * ids on the current page — never the other 130+. Used by the Admin and
 * Manager consoles' Members tabs (components/MembersList.tsx), not by the
 * polled snapshot. */
async function membersList({ site, q: search, page, pageSize }: {
  site: string; q: string; page: number; pageSize: number;
}) {
  const conditions = [
    ...(site !== 'all' ? [eq(members.siteId, site)] : []),
    ...(search ? [ilike(members.name, `%${search}%`)] : []),
  ];
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ count }, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(members).where(where).then((r) => r[0]),
    db.select().from(members).where(where).orderBy(members.name).limit(pageSize).offset((page - 1) * pageSize),
  ]);

  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return { members: [], total: count, page, pageSize };

  const [memberFlags, memberSessions, memberPrograms, memberAssessments] = await Promise.all([
    db.select().from(flags).where(inArray(flags.memberId, ids)),
    db.select().from(sessions).where(inArray(sessions.memberId, ids)).orderBy(desc(sessions.completedAt)),
    db.select().from(programs).where(inArray(programs.memberId, ids)),
    db.select().from(assessments).where(inArray(assessments.memberId, ids)).orderBy(desc(assessments.capturedAt)),
  ]);
  const latestAssessmentByMember: Record<string, string> = {};
  for (const a of memberAssessments) if (!latestAssessmentByMember[a.memberId]) latestAssessmentByMember[a.memberId] = a.id;
  const latestAssessmentIds = Object.values(latestAssessmentByMember);
  const memberMeasurements = latestAssessmentIds.length
    ? await db.select().from(measurements).where(inArray(measurements.assessmentId, latestAssessmentIds))
    : [];

  const out = rows.map((m) => {
    const meas = memberMeasurements.filter((x) => x.assessmentId === latestAssessmentByMember[m.id]);
    const prog = memberPrograms.find((p) => p.memberId === m.id);
    const recent = memberSessions.find((s) => s.memberId === m.id);
    const scores = meas.length
      ? computeScores({
          measurements: meas, hasWearable: !!m.wearable, streak: m.streak,
          adherence: prog ? Math.min(prog.completions.length / 6, 1) : 0.5,
          recentRpe: recent?.rpe ?? 6,
        })
      : { flexibility: 0, mobility: 0, recovery: 0 };
    return {
      ...m, scores,
      flagCount: memberFlags.filter((f) => f.memberId === m.id).length,
      sessionCount: memberSessions.filter((s) => s.memberId === m.id).length,
      lastSession: recent?.completedAt ?? null,
    };
  });

  return { members: out, total: count, page, pageSize };
}

async function slotsFor(dateStr: string, serviceId: string) {
  const sv = service(serviceId) ?? bad('Unknown service', 404);
  const taken = await db.select().from(bookings).where(eq(bookings.date, dateStr));
  const busy = new Set(taken.filter((b) => b.status !== 'cancelled').map((b) => b.time));
  const step = sv.mins >= 60 ? 1 : 0.5;
  const out: { time: string; busy: boolean }[] = [];
  for (let h = 8; h < 20; h += step) {
    const time = `${String(Math.floor(h)).padStart(2, '0')}:${(h % 1) ? '30' : '00'}`;
    out.push({ time, busy: busy.has(time) });
  }
  return out;
}

async function latestMeasurements(memberId: string) {
  const [a] = await db.select().from(assessments).where(eq(assessments.memberId, memberId))
    .orderBy(desc(assessments.capturedAt)).limit(1);
  if (!a) return { assessment: null, measurements: [] as any[] };
  const m = await db.select().from(measurements).where(eq(measurements.assessmentId, a.id));
  return { assessment: a, measurements: m };
}

/** Recompute today's score row after anything that could move it. */
async function refreshScoreDay(memberId: string) {
  const [m] = await db.select().from(members).where(eq(members.id, memberId));
  if (!m) return;
  const { measurements: meas } = await latestMeasurements(memberId);
  if (!meas.length) return;
  const [prog] = await db.select().from(programs).where(eq(programs.memberId, memberId));
  const [recent] = await db.select().from(sessions).where(eq(sessions.memberId, memberId))
    .orderBy(desc(sessions.completedAt)).limit(1);
  const sc = computeScores({
    measurements: meas, hasWearable: !!m.wearable, streak: m.streak,
    adherence: prog ? Math.min(prog.completions.length / 6, 1) : 0.5,
    recentRpe: recent?.rpe ?? 6,
  });
  const id = `sd_${memberId}_today`;
  await db.delete(scoreDays).where(and(eq(scoreDays.memberId, memberId), eq(scoreDays.date, todayIso())));
  await db.insert(scoreDays).values({ id, memberId, date: todayIso(), ...sc } as any);
}

/* ---------- dispatcher ---------- */

async function handle(verb: string, seg: string[], q: URLSearchParams, body: any) {
  const p = seg.join('/');

  /* --- read --- */
  if (verb === 'GET' && p === 'snapshot') {
    const kind = q.get('scope');
    const id = q.get('id');
    return snapshot(
      kind === 'member' || kind === 'coach' || kind === 'manager' ? { kind, id: id || '' } : undefined,
    );
  }

  if (verb === 'GET' && p === 'directory') return directory();

  if (verb === 'GET' && p === 'members/list') {
    return membersList({
      site: q.get('site') || 'all',
      q: (q.get('q') || '').trim(),
      page: Math.max(1, parseInt(q.get('page') || '1', 10) || 1),
      pageSize: Math.min(50, Math.max(1, parseInt(q.get('pageSize') || '20', 10) || 20)),
    });
  }

  if (verb === 'GET' && p === 'availability') {
    const date = q.get('date') || todayIso();
    const serviceId = q.get('serviceId') || 'st30';
    return { date, serviceId, slots: await slotsFor(date, serviceId) };
  }

  /* Shift- and overlap-aware slots for one coach on one date — what the
     manager console's TimeSlotPicker renders. Distinct from the flat
     /availability above (which is coach-agnostic and ignores shifts) so the
     existing member self-booking flow is untouched. */
  if (verb === 'GET' && seg[0] === 'coaches' && seg[2] === 'availability') {
    const coachId = seg[1];
    const date = q.get('date') || todayIso();
    const serviceId = q.get('serviceId') || 'st30';
    const excludeBookingId = q.get('excludeBookingId') || undefined;
    const sv = service(serviceId) ?? bad('Unknown service', 404);
    const [coachShifts, dayBookings] = await Promise.all([
      db.select().from(shifts).where(and(eq(shifts.coachId, coachId), eq(shifts.date, date))),
      db.select().from(bookings).where(and(eq(bookings.coachId, coachId), eq(bookings.date, date))),
    ]);
    return {
      slots: computeFreeSlots({
        shifts: coachShifts, bookings: dayBookings, serviceMins: sv.mins, excludeBookingId,
      }),
    };
  }

  if (verb === 'GET' && seg[0] === 'members' && seg.length === 2) {
    const [m] = await db.select().from(members).where(eq(members.id, seg[1]));
    if (!m) bad('Member not found', 404);
    const { assessment, measurements: meas } = await latestMeasurements(m.id);
    return {
      member: m, latestAssessment: assessment, measurements: meas,
      priority: priorityAreas(meas).map((x) => ({ ...x, label: muscle(x.muscleKey).label })),
      sessions: await db.select().from(sessions).where(eq(sessions.memberId, m.id)).orderBy(desc(sessions.completedAt)),
      programs: await db.select().from(programs).where(eq(programs.memberId, m.id)),
      flags: await db.select().from(flags).where(eq(flags.memberId, m.id)),
    };
  }

  /* --- members & coaches --- */
  if (verb === 'POST' && p === 'members') {
    if (!body.name?.trim()) bad('Name is required');
    const id = uid('m');
    await db.insert(members).values({
      id, name: body.name.trim(), phone: body.phone || '+971 5x xxx xxxx', goal: body.goal || null,
      persona: 'custom', joinedAt: todayIso(), siteId: body.siteId || 's1', credits: body.credits ?? 0, streak: 0,
      wearable: body.wearable || null, parqCleared: !!body.parqCleared,
      parqAt: body.parqCleared ? todayIso() : null, addedByCoachId: body.coachId || null, isDemo: false,
    } as any);
    if (!body.parqCleared) {
      await db.insert(flags).values({ id: uid('fl'), memberId: id, text: 'PAR-Q not completed. Screen before first session.', since: todayIso() } as any);
    }
    return { memberId: id, created: true, note: 'Member starts with no assessment — this is the empty state.' };
  }

  if (verb === 'POST' && p === 'coaches') {
    if (!body.name?.trim()) bad('Name is required');
    const id = uid('c');
    const initials = body.name.trim().split(/\s+/).map((x: string) => x[0]).join('').slice(0, 2).toUpperCase();
    await db.insert(coaches).values({ id, name: body.name.trim(), initials, title: body.title || 'Flexologist', siteId: body.siteId || 's1', isDemo: false } as any);
    return { coachId: id, created: true };
  }

  if (verb === 'POST' && p === 'managers') {
    if (!body.name?.trim()) bad('Name is required');
    const id = uid('mg');
    const initials = body.name.trim().split(/\s+/).map((x: string) => x[0]).join('').slice(0, 2).toUpperCase();
    await db.insert(managers).values({ id, name: body.name.trim(), initials, siteId: body.siteId || 's1', isDemo: false } as any);
    return { managerId: id, created: true };
  }

  /* --- shifts (manager console) --- */
  if (verb === 'POST' && p === 'shifts') {
    if (!body.coachId || !body.date || !body.startTime || !body.endTime) bad('coachId, date, startTime and endTime are required');
    const id = uid('sft');
    await db.insert(shifts).values({
      id, coachId: body.coachId, siteId: body.siteId || 's1', date: body.date,
      startTime: body.startTime, endTime: body.endTime, createdByManagerId: body.managerId || null, isDemo: false,
    } as any);
    return { shiftId: id, created: true };
  }
  if (verb === 'DELETE' && seg[0] === 'shifts') {
    await db.delete(shifts).where(eq(shifts.id, seg[1]));
    return { removed: seg[1] };
  }

  /* Self-service PAR-Q. Deliberate exception to the "a named person clears
     it" rule — see PARQ_QUESTIONS in lib/reference.ts and docs/adr/0001.
     Checked before the coach-clear route below since both match seg[2]==='parq'. */
  if (verb === 'POST' && seg[0] === 'members' && seg[2] === 'parq' && seg[3] === 'submit') {
    const answers: Record<string, boolean> = body.answers || {};
    const redFlagged = PARQ_QUESTIONS.some((q) => q.redFlag && answers[q.key]);
    if (redFlagged) {
      const existing = await db.select().from(flags).where(eq(flags.memberId, seg[1]));
      if (!existing.some((f) => /PAR-Q referral/i.test(f.text))) {
        await db.insert(flags).values({
          id: uid('fl'), memberId: seg[1],
          text: 'PAR-Q referral — please see a physician before starting an activity programme.',
          since: todayIso(),
        } as any);
      }
      await db.update(members).set({ parqCleared: false, parqAt: todayIso() } as any).where(eq(members.id, seg[1]));
      return { cleared: false, referral: true, message: 'Based on your answers, please check with a physician before your first session. We will not book you in until then.' };
    }
    await db.update(members).set({ parqCleared: true, parqAt: todayIso() } as any).where(eq(members.id, seg[1]));
    const fs = await db.select().from(flags).where(eq(flags.memberId, seg[1]));
    const parqFlags = fs.filter((f) => /PAR-Q/i.test(f.text)).map((f) => f.id);
    if (parqFlags.length) await db.delete(flags).where(inArray(flags.id, parqFlags));
    return { cleared: true };
  }

  if (verb === 'POST' && seg[0] === 'members' && seg[2] === 'parq') {
    await db.update(members).set({ parqCleared: !!body.cleared, parqAt: todayIso() } as any).where(eq(members.id, seg[1]));
    if (body.cleared) {
      const fs = await db.select().from(flags).where(eq(flags.memberId, seg[1]));
      const parqFlags = fs.filter((f) => /PAR-Q/i.test(f.text)).map((f) => f.id);
      if (parqFlags.length) await db.delete(flags).where(inArray(flags.id, parqFlags));
    }
    return { memberId: seg[1], parqCleared: !!body.cleared };
  }

  if (verb === 'POST' && seg[0] === 'members' && seg[2] === 'flags') {
    const id = uid('fl');
    await db.insert(flags).values({ id, memberId: seg[1], text: body.text, since: todayIso() } as any);
    return { flag: { id, text: body.text } };
  }
  if (verb === 'DELETE' && seg[0] === 'members' && seg[2] === 'flags') {
    await db.delete(flags).where(eq(flags.id, seg[3]));
    return { removed: seg[3] };
  }

  if (verb === 'POST' && seg[0] === 'members' && seg[2] === 'wearable') {
    await db.update(members).set({ wearable: body.provider } as any).where(eq(members.id, seg[1]));
    await refreshScoreDay(seg[1]);
    return { provider: body.provider, linked: true, scopes: ['hrv', 'sleep', 'strain'] };
  }

  /* --- bookings --- */
  if (verb === 'POST' && p === 'bookings') {
    const [m] = await db.select().from(members).where(eq(members.id, body.memberId));
    if (!m) bad('Member not found', 404);
    if (!m.parqCleared) bad('PAR-Q screening required before booking', 409);
    const sv = service(body.serviceId) ?? bad('Unknown service', 404);
    const slots = await slotsFor(body.date, body.serviceId);
    if (slots.find((s) => s.time === body.time)?.busy) bad('Slot no longer available', 409);
    const addons: string[] = body.addons || [];
    const aed = sv.aed + addons.reduce((s, a) => s + addon(a).aed, 0);
    const id = uid('bk');
    await db.insert(bookings).values({ id, memberId: m.id, coachId: null, siteId: m.siteId, serviceId: sv.id, date: body.date, time: body.time, status: 'requested', addons, aed } as any);
    return { booking: { id, status: 'requested', aed }, message: 'Request sent to the studio' };
  }

  /* Manager-entered booking (walk-in / phone) — a coach is picked up front,
     so this validates against that coach's shifts and existing bookings
     (lib/scheduling.ts) rather than the flat studio-wide grid /bookings
     above uses, and lands directly as confirmed. Mirrors the root product's
     manual booking intake (docs/architecture/overview.md, studio console). */
  if (verb === 'POST' && p === 'bookings/manual') {
    const [m] = await db.select().from(members).where(eq(members.id, body.memberId));
    if (!m) bad('Member not found', 404);
    if (!m.parqCleared) bad('PAR-Q screening required before booking', 409);
    if (!body.coachId) bad('coachId is required');
    const sv = service(body.serviceId) ?? bad('Unknown service', 404);
    const [coachShifts, dayBookings] = await Promise.all([
      db.select().from(shifts).where(and(eq(shifts.coachId, body.coachId), eq(shifts.date, body.date))),
      db.select().from(bookings).where(and(eq(bookings.coachId, body.coachId), eq(bookings.date, body.date))),
    ]);
    const slots = computeFreeSlots({ shifts: coachShifts, bookings: dayBookings, serviceMins: sv.mins });
    if (!slots.find((s) => s.time === body.time)?.available) bad('That coach is not free at that time', 409);
    const id = uid('bk');
    await db.insert(bookings).values({
      id, memberId: m.id, coachId: body.coachId, siteId: m.siteId, serviceId: sv.id,
      date: body.date, time: body.time, status: 'confirmed', addons: [], aed: sv.aed,
    } as any);
    return { booking: { id, status: 'confirmed', aed: sv.aed }, message: 'Booked' };
  }

  if (verb === 'POST' && seg[0] === 'bookings' && seg[2] === 'confirm') {
    if (!body.coachId) bad('coachId is required');
    await db.update(bookings).set({ status: 'confirmed', coachId: body.coachId } as any).where(eq(bookings.id, seg[1]));
    return { bookingId: seg[1], status: 'confirmed', notified: ['push', 'whatsapp'] };
  }
  if (verb === 'POST' && seg[0] === 'bookings' && seg[2] === 'decline') {
    await db.update(bookings).set({ status: 'cancelled' } as any).where(eq(bookings.id, seg[1]));
    return { bookingId: seg[1], status: 'cancelled', reason: body.reason || 'Studio unavailable', notified: ['push', 'whatsapp'] };
  }
  if (verb === 'POST' && seg[0] === 'bookings' && seg[2] === 'reschedule') {
    const [bk] = await db.select().from(bookings).where(eq(bookings.id, seg[1]));
    if (!bk) bad('Booking not found', 404);
    if (bk.coachId) {
      const sv = service(bk.serviceId) ?? bad('Unknown service', 404);
      const [coachShifts, dayBookings] = await Promise.all([
        db.select().from(shifts).where(and(eq(shifts.coachId, bk.coachId), eq(shifts.date, body.date))),
        db.select().from(bookings).where(and(eq(bookings.coachId, bk.coachId), eq(bookings.date, body.date))),
      ]);
      const slots = computeFreeSlots({ shifts: coachShifts, bookings: dayBookings, serviceMins: sv.mins, excludeBookingId: bk.id });
      if (!slots.find((s) => s.time === body.time)?.available) bad('That coach is not free at that time', 409);
    }
    await db.update(bookings).set({ date: body.date, time: body.time } as any).where(eq(bookings.id, seg[1]));
    return { bookingId: seg[1], date: body.date, time: body.time };
  }
  if (verb === 'POST' && seg[0] === 'bookings' && seg[2] === 'reassign') {
    const [bk] = await db.select().from(bookings).where(eq(bookings.id, seg[1]));
    if (!bk) bad('Booking not found', 404);
    if (!body.coachId) bad('coachId is required');
    const sv = service(bk.serviceId) ?? bad('Unknown service', 404);
    const [coachShifts, dayBookings] = await Promise.all([
      db.select().from(shifts).where(and(eq(shifts.coachId, body.coachId), eq(shifts.date, bk.date))),
      db.select().from(bookings).where(and(eq(bookings.coachId, body.coachId), eq(bookings.date, bk.date))),
    ]);
    const slots = computeFreeSlots({ shifts: coachShifts, bookings: dayBookings, serviceMins: sv.mins, excludeBookingId: bk.id });
    if (!slots.find((s) => s.time === bk.time)?.available) bad('That coach is not free at that time', 409);
    await db.update(bookings).set({ coachId: body.coachId } as any).where(eq(bookings.id, seg[1]));
    return { bookingId: seg[1], coachId: body.coachId };
  }
  if (verb === 'DELETE' && seg[0] === 'bookings') {
    await db.update(bookings).set({ status: 'cancelled' } as any).where(eq(bookings.id, seg[1]));
    return { bookingId: seg[1], status: 'cancelled' };
  }

  /* --- assessments --- */
  if (verb === 'POST' && p === 'integrations/bodymap/import') {
    const { measurements: prev } = await latestMeasurements(body.memberId);
    const norm = simulateDeviceRead(prev.length ? prev : null);
    const id = uid('as');
    await db.insert(assessments).values({ id, memberId: body.memberId, coachId: body.coachId || null, capturedAt: todayIso(), source: norm.source, deviceId: norm.deviceId } as any);
    await db.insert(measurements).values(norm.measurements.map((m) => ({ assessmentId: id, memberId: body.memberId, ...m })) as any);
    await refreshScoreDay(body.memberId);
    return { assessmentId: id, source: 'bodymap', deviceId: norm.deviceId, ingestedVia: 'adapter/bodymap-simulated', measurementCount: norm.measurements.length };
  }

  if (verb === 'POST' && seg[0] === 'members' && seg[2] === 'assessments') {
    const norm = fromManualEntry(body.measurements);
    const id = uid('as');
    await db.insert(assessments).values({ id, memberId: seg[1], coachId: body.coachId || null, capturedAt: todayIso(), source: 'manual', deviceId: null } as any);
    await db.insert(measurements).values(norm.measurements.map((m) => ({ assessmentId: id, memberId: seg[1], ...m })) as any);
    await refreshScoreDay(seg[1]);
    return { assessmentId: id, source: 'manual', measurementCount: norm.measurements.length };
  }

  /* --- sessions --- */
  if (verb === 'POST' && p === 'sessions') {
    const [m] = await db.select().from(members).where(eq(members.id, body.memberId));
    if (!m) bad('Member not found', 404);
    if (!body.memberSummary?.trim()) bad('A member-facing summary is required', 422);
    if (!body.coachId) bad('coachId is required');
    const id = uid('se');
    await db.insert(sessions).values({
      id, memberId: m.id, coachId: body.coachId, bookingId: body.bookingId || null,
      completedAt: todayIso(), mins: body.mins, modalities: body.modalities || [],
      rpe: body.rpe, painBefore: body.painBefore, painAfter: body.painAfter,
      coachNotes: body.coachNotes || null, memberSummary: body.memberSummary,
    } as any);
    if (body.bookingId) await db.update(bookings).set({ status: 'completed' } as any).where(eq(bookings.id, body.bookingId));
    await db.update(members).set({ credits: Math.max(m.credits - 1, 0), streak: m.streak + 1 } as any).where(eq(members.id, m.id));
    await refreshScoreDay(m.id);
    return { sessionId: id, creditsRemaining: Math.max(m.credits - 1, 0), notified: ['push'] };
  }

  /* --- programmes & check-ins --- */
  if (verb === 'POST' && seg[0] === 'members' && seg[2] === 'programs') {
    const id = uid('pg');
    await db.insert(programs).values({ id, memberId: seg[1], coachId: body.coachId || null, title: body.title, assignedAt: todayIso(), moves: body.moves || [], completions: [] } as any);
    return { programId: id, notified: ['push'] };
  }
  if (verb === 'POST' && seg[0] === 'programs' && seg[2] === 'complete') {
    const [pg] = await db.select().from(programs).where(eq(programs.id, seg[1]));
    if (!pg) bad('Programme not found', 404);
    const done = new Set(pg.completions); done.add(todayIso());
    await db.update(programs).set({ completions: [...done] } as any).where(eq(programs.id, pg.id));
    await refreshScoreDay(pg.memberId);
    return { programId: pg.id, completions: [...done] };
  }
  if (verb === 'POST' && p === 'checkins') {
    const id = uid('ck');
    await db.insert(checkins).values({ id, memberId: body.memberId, sleep: body.sleep, pain: body.pain, areas: body.areas || [], note: body.note || null } as any);
    return { checkinId: id, visibleToCoach: true };
  }

  /* --- admin / demo tooling --- */
  if (verb === 'GET' && p === 'admin/tables') {
    const tables = {
      members: await db.select().from(members),
      coaches: await db.select().from(coaches),
      managers: await db.select().from(managers),
      shifts: await db.select().from(shifts).orderBy(desc(shifts.date)),
      bookings: await db.select().from(bookings).orderBy(desc(bookings.createdAt)),
      assessments: await db.select().from(assessments).orderBy(desc(assessments.capturedAt)),
      measurements: (await db.select().from(measurements)).slice(0, 200),
      sessions: await db.select().from(sessions).orderBy(desc(sessions.completedAt)),
      programs: await db.select().from(programs),
      checkins: await db.select().from(checkins).orderBy(desc(checkins.at)),
      flags: await db.select().from(flags),
      score_days: (await db.select().from(scoreDays).orderBy(desc(scoreDays.date))).slice(0, 100),
    };
    return { tables, counts: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, (v as any[]).length])) };
  }

  if (verb === 'POST' && p === 'admin/seed') return { reseeded: await seed() };

  bad(`No route for ${verb} /${p}`, 404);
}

/* ---------- Next.js glue ---------- */

async function run(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }, verb: string) {
  const { path } = await ctx.params;
  const started = Date.now();
  let body: any = {};
  if (verb === 'POST' || verb === 'PATCH') { try { body = await req.json(); } catch { body = {}; } }
  try {
    const data = await handle(verb, path, req.nextUrl.searchParams, body);
    return NextResponse.json(data, { headers: { 'x-marn-ms': String(Date.now() - started) } });
  } catch (e: any) {
    const status = e instanceof ApiError ? e.status : 500;
    if (status === 500) console.error('[marn]', verb, path.join('/'), e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status, headers: { 'x-marn-ms': String(Date.now() - started) } });
  }
}

export const GET = (r: NextRequest, c: any) => run(r, c, 'GET');
export const POST = (r: NextRequest, c: any) => run(r, c, 'POST');
export const DELETE = (r: NextRequest, c: any) => run(r, c, 'DELETE');