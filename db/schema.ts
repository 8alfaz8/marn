import { pgTable, pgEnum, text, integer, boolean, timestamp, jsonb, serial, date } from 'drizzle-orm/pg-core';

/* ---------------------------------------------------------------------------
   MARN — root product canonical schema.

   Scope: Phase 1, staff-side slice only (coach console + studio manager
   console). No member auth, payments, or self-service booking yet — those
   are blueprint Phase 2. See docs/adr/0007-root-schema-shape.md for the
   reasoning behind this shape and docs/adr/0008-studio-manager-role.md for
   the role split.

   Plain Postgres, no vendor-specific types — moving host is a DATABASE_URL
   change only (see db/index.ts).
--------------------------------------------------------------------------- */

export const staffRole = pgEnum('staff_role', ['coach', 'studio_manager', 'superadmin']);
export const bookingStatus = pgEnum('booking_status', ['requested', 'confirmed', 'declined', 'completed', 'cancelled']);
export const measurementSource = pgEnum('measurement_source', ['bodymap', 'coach_manual', 'member_report']);
export const cashLedgerType = pgEnum('cash_ledger_type', ['manual_in', 'manual_out']);
export const auditAction = pgEnum('audit_action', [
  'assessment_created',
  'assessment_amended',
  'session_logged',
  'session_edited',
  'flag_raised',
  'flag_cleared',
  'readiness_changed',
  'booking_requested',
  'booking_approved',
  'booking_declined',
  'booking_rescheduled',
  'booking_reassigned',
  'shift_assigned',
  'staff_read_outside_site',
  'site_created',
  'staff_site_assigned',
  'cash_entry_recorded',
  'staff_impersonated',
  'member_access_link_created',
  'member_access_link_revoked',
]);

export const sites = pgTable('sites', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* Coaches, studio managers, and superadmins. Auth credentials live in
   better-auth's own user/account/session tables (lib/auth) — this is the
   business-domain record, joined by authUserId. Kept separate from
   `members` per blueprint §10.1: a coach account is never a member account
   with a flag set. `siteId` is nullable only for `superadmin` — a coach or
   studio_manager is always pinned to exactly one site (docs/adr/0011). */
export const staff = pgTable('staff', {
  id: text('id').primaryKey(),
  authUserId: text('auth_user_id').notNull().unique(),
  name: text('name').notNull(),
  role: staffRole('role').notNull(),
  siteId: text('site_id').references(() => sites.id),
  active: boolean('active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* Client roster (added by staff — no member self-signup in this slice).
   Contact fields exist on the row but are access-gated at the query layer,
   not the schema: a coach's read path never selects phone/email, a studio
   manager's does. See docs/adr/0008. */
export const members = pgTable('members', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  siteId: text('site_id').notNull().references(() => sites.id),
  addedByStaffId: text('added_by_staff_id').notNull().references(() => staff.id),
  parqCleared: boolean('parq_cleared').default(false).notNull(),
  parqAt: timestamp('parq_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* Persistent per-member safety flag. Gates the affected activity until a
   named person clears it — no automatic expiry, no clearing on the
   member's own say-so (Iron Rule). */
export const flags = pgTable('flags', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  text: text('text').notNull(),
  raisedByStaffId: text('raised_by_staff_id').notNull().references(() => staff.id),
  raisedAt: timestamp('raised_at').defaultNow().notNull(),
  clearedByStaffId: text('cleared_by_staff_id').references(() => staff.id),
  clearedAt: timestamp('cleared_at'),
});

/* One capture event — who was measured, by whom, when, by what method
   (blueprint §5.2). */
export const assessments = pgTable('assessments', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  staffId: text('staff_id').references(() => staff.id),
  siteId: text('site_id').notNull().references(() => sites.id),
  capturedAt: timestamp('captured_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* One number about one thing: a muscle group, a joint angle in degrees, and
   the target for that group (blueprint §5.2). Provenance is mandatory on
   every row (Iron Rule) — a derived/estimated value never lands in the same
   column as a measured one, and every row can say where it came from. */
export const measurements = pgTable('measurements', {
  id: serial('id').primaryKey(),
  assessmentId: text('assessment_id').notNull().references(() => assessments.id),
  memberId: text('member_id').notNull().references(() => members.id),
  muscleKey: text('muscle_key').notNull(),
  degrees: integer('degrees').notNull(),
  target: integer('target').notNull(),
  source: measurementSource('source').notNull(),
  instrument: text('instrument').notNull(),
  protocolVersion: text('protocol_version').notNull(),
  measuredAt: timestamp('measured_at').notNull(),
  measuredBy: text('measured_by').notNull(),
});

/* Pre-session intake — what the coach sees before the member walks in. */
export const checkins = pgTable('checkins', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  at: timestamp('at').defaultNow().notNull(),
  sleep: integer('sleep').notNull(),
  pain: integer('pain').notNull(),
  areas: jsonb('areas').$type<string[]>().default([]).notNull(),
  note: text('note'),
});

/* Manual booking entry by staff (blueprint Phase 1 — no member self-service
   yet). Approval is exclusive to the studio manager in this slice: `coachId`
   is null until a manager assigns one on approval; a coach never
   confirms/declines their own bookings here. `aed` is a revenue proxy for
   the studio-manager earnings view — there is no real payments/POS system
   yet (that stays blueprint Phase 2 per the "Booking and POS are ours"
   Iron Rule: in-house when built, not built now). */
export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  coachId: text('coach_id').references(() => staff.id),
  siteId: text('site_id').notNull().references(() => sites.id),
  serviceId: text('service_id').notNull(),
  date: date('date').notNull(),
  time: text('time').notNull(),
  aed: integer('aed').notNull(),
  status: bookingStatus('status').default('requested').notNull(),
  approvedByStaffId: text('approved_by_staff_id').references(() => staff.id),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* Modalities used, RPE, pain before/after, internal note, member-facing
   summary. The summary is required — enforced in the write path, not just
   the schema, per blueprint §4.2.4 ("the API rejects a session without
   one"). */
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  coachId: text('coach_id').notNull().references(() => staff.id),
  bookingId: text('booking_id').references(() => bookings.id),
  completedAt: timestamp('completed_at').notNull(),
  mins: integer('mins').notNull(),
  modalities: jsonb('modalities').$type<string[]>().default([]).notNull(),
  rpe: integer('rpe').notNull(),
  painBefore: integer('pain_before').notNull(),
  painAfter: integer('pain_after').notNull(),
  coachNotes: text('coach_notes'),
  memberSummary: text('member_summary').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* Studio-manager-assigned staff shifts. */
export const shifts = pgTable('shifts', {
  id: text('id').primaryKey(),
  staffId: text('staff_id').notNull().references(() => staff.id),
  siteId: text('site_id').notNull().references(() => sites.id),
  date: date('date').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  createdByStaffId: text('created_by_staff_id').notNull().references(() => staff.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* Append-only (blueprint §10.3). Never carries the health-data content
   itself — only what happened and to which entity (Iron Rule: health data
   never enters logs, traces, or analytics). */
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  actorStaffId: text('actor_staff_id').notNull().references(() => staff.id),
  action: auditAction('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  at: timestamp('at').defaultNow().notNull(),
});

/* Cash movements that aren't a booking — walk-in payments, refunds,
   till adjustments. Booking revenue keeps deriving from `bookings.aed`
   (unchanged, docs/adr/0007); this table only covers the gap that leaves
   (docs/adr/0011). Superadmin-recorded for now. */
export const cashLedger = pgTable('cash_ledger', {
  id: serial('id').primaryKey(),
  siteId: text('site_id').notNull().references(() => sites.id),
  type: cashLedgerType('type').notNull(),
  amountAed: integer('amount_aed').notNull(),
  note: text('note'),
  relatedBookingId: text('related_booking_id').references(() => bookings.id),
  recordedByStaffId: text('recorded_by_staff_id').notNull().references(() => staff.id),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

/* One row per readiness screening event (blueprint §4.1.10, PAR-Q-derived,
   completed with a coach). `redFlag` false is what "cleared" means for that
   event; `members.parqCleared`/`parqAt` are a denormalized read of the
   latest event, written only by lib/actions/parq.ts, so the booking/session
   gate stays a single-column check. No clearing on the member's own say-so
   and no automatic expiry (Iron Rule) — every row here is staff-attributed
   and a fresh red flag always overwrites a prior clearance. */
export const parqScreenings = pgTable('parq_screenings', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id),
  staffId: text('staff_id').notNull().references(() => staff.id),
  siteId: text('site_id').notNull().references(() => sites.id),
  answers: jsonb('answers').$type<Record<string, boolean>>().notNull(),
  redFlag: boolean('red_flag').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/* Staff-issued, revocable read-only link for the Phase 1 member portal —
   no member auth yet (blueprint Phase 2), so the token itself is the only
   credential. Generating a new one revokes any prior active token for that
   member (one live link at a time), so a leaked link can be invalidated by
   just generating a fresh one. */
export const memberAccessTokens = pgTable('member_access_tokens', {
  id: serial('id').primaryKey(),
  token: text('token').notNull().unique(),
  memberId: text('member_id').notNull().references(() => members.id),
  createdByStaffId: text('created_by_staff_id').notNull().references(() => staff.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
  revokedByStaffId: text('revoked_by_staff_id').references(() => staff.id),
});
