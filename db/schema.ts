import { pgTable, text, integer, boolean, timestamp, jsonb, serial, date } from 'drizzle-orm/pg-core';

/* ---------------------------------------------------------------------------
   MARN — canonical schema.

   Two rules worth keeping as this grows:

   1. `measurements` is deliberately its own table rather than a JSON blob on
      `assessments`. Every ROM number is a first-class row so you can query
      "show me left hamstring across all members over 6 months" without
      unpacking JSON. This table is the actual asset of the business.

   2. Nothing here is Neon-specific or Supabase-specific. Plain Postgres.
      Moving to RDS in me-central-1 is a change of DATABASE_URL.
--------------------------------------------------------------------------- */

export const coaches = pgTable('coaches', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  initials: text('initials').notNull(),
  title: text('title').default('Flexologist').notNull(),
  siteId: text('site_id').default('s1').notNull(),
  isDemo: boolean('is_demo').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const members = pgTable('members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  goal: text('goal'),
  // persona drives the seeded shape: power | active | new | custom
  persona: text('persona').default('custom').notNull(),
  joinedAt: date('joined_at').notNull(),
  credits: integer('credits').default(0).notNull(),
  streak: integer('streak').default(0).notNull(),
  wearable: text('wearable'),
  parqCleared: boolean('parq_cleared').default(false).notNull(),
  parqAt: date('parq_at'),
  // Set when a coach adds the member from the console (Coach.tsx "Add a
  // member"), null for self-service signups (Gate.tsx). Lets
  // scopeSnapshotForCoach keep a freshly-added member in that coach's own
  // roster before any booking/session/assessment exists to tie them together.
  addedByCoachId: text('added_by_coach_id'),
  isDemo: boolean('is_demo').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* Contraindications and safety notes the coach must see before touching anyone. */
export const flags = pgTable('flags', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull(),
  text: text('text').notNull(),
  since: date('since').notNull(),
});

export const assessments = pgTable('assessments', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull(),
  coachId: text('coach_id'),
  capturedAt: date('captured_at').notNull(),
  source: text('source').notNull(), // bodymap | manual
  deviceId: text('device_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const measurements = pgTable('measurements', {
  id: serial('id').primaryKey(),
  assessmentId: text('assessment_id').notNull(),
  memberId: text('member_id').notNull(),
  muscleKey: text('muscle_key').notNull(),
  degrees: integer('degrees').notNull(),
  target: integer('target').notNull(),
});

export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull(),
  coachId: text('coach_id'),
  serviceId: text('service_id').notNull(),
  date: date('date').notNull(),
  time: text('time').notNull(),
  status: text('status').default('requested').notNull(), // requested|confirmed|completed|cancelled
  addons: jsonb('addons').$type<string[]>().default([]).notNull(),
  aed: integer('aed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull(),
  coachId: text('coach_id').notNull(),
  bookingId: text('booking_id'),
  completedAt: date('completed_at').notNull(),
  mins: integer('mins').notNull(),
  modalities: jsonb('modalities').$type<string[]>().default([]).notNull(),
  rpe: integer('rpe').notNull(),
  painBefore: integer('pain_before').notNull(),
  painAfter: integer('pain_after').notNull(),
  coachNotes: text('coach_notes'),      // internal
  memberSummary: text('member_summary'), // what the member reads
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const programs = pgTable('programs', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull(),
  coachId: text('coach_id'),
  title: text('title').notNull(),
  assignedAt: date('assigned_at').notNull(),
  moves: jsonb('moves').$type<{ n: string; d: string }[]>().default([]).notNull(),
  completions: jsonb('completions').$type<string[]>().default([]).notNull(),
});

/* Pre-session intake: what the coach sees before the member walks in. */
export const checkins = pgTable('checkins', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull(),
  at: timestamp('at').defaultNow().notNull(),
  sleep: integer('sleep').notNull(),
  pain: integer('pain').notNull(),
  areas: jsonb('areas').$type<string[]>().default([]).notNull(),
  note: text('note'),
});

/* Daily composite scores. Denormalised on purpose — the progress chart is the
   most-read screen in the product and should never join five tables. */
export const scoreDays = pgTable('score_days', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull(),
  date: date('date').notNull(),
  flexibility: integer('flexibility').notNull(),
  mobility: integer('mobility').notNull(),
  recovery: integer('recovery').notNull(),
});
