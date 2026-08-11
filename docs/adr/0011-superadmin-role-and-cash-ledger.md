# 0011 — Superadmin role, nullable staff site, cash ledger table

**Status:** Accepted
**Date:** 2026-08-11

## Context

The studio manager console (`docs/adr/0008`) shipped with exactly two staff
roles, `coach` and `studio_manager`, each pinned to one `sites` row. The
product owner asked for a role above studio manager — one account
(`alfaz@marn.studio`) with visibility across every studio: overall metrics,
cash ledgers, and staff/member views a site-scoped studio manager can't see,
plus the ability to create studios and assign studio managers to them. This
is a new role spanning auth, schema, and cross-site data access — the class
of change `CLAUDE.md` requires confirming before starting; confirmed by
direct quiz on 2026-08-11 (`docs/decisions.md`).

Two supporting gaps had to be closed for the role to be useful rather than
cosmetic:

- `staff.siteId` was `notNull` — a role not pinned to one site can't satisfy
  that constraint without either a sentinel site row (rejected — a fake
  "all sites" row would corrupt every other site-scoped query) or making the
  column nullable for this one role.
- "Cash ledgers" (plural, per the request) doesn't exist as a concept yet.
  Revenue today is only ever derived by summing `bookings.aed` — there's
  nowhere to record a cash movement that isn't a booking (a walk-in payment,
  a refund, a till adjustment).

## Decision

1. **`staffRole` enum gains `'superadmin'`.** Not a new table, not a
   separate "platform_admin" concept — same `staff` row shape, same
   better-auth join by `authUserId`, one more enum value.
2. **`staff.siteId` becomes nullable.** Enforced in code, not the schema: a
   `superadmin` row has `siteId = null`; `coach` and `studio_manager` rows
   still always carry one (nothing in the app ever writes a null `siteId`
   for those two roles). `lib/authz.ts`'s `assertMemberInScope` grows one
   branch — a superadmin session skips the site match entirely.
3. **`superadmin` is the blueprint's platform-admin concept, not "corporate
   admin."** The blueprint's Iron Rules restrict a *corporate admin*
   (employer-side, HR-facing) to aggregates only, never an individual
   member's measurements without recorded consent. Superadmin here is an
   internal, high-trust operational role — same unrestricted per-member
   access a studio manager has today, just not site-locked. If a future
   phase wants the blueprint's corporate-admin role too, that's a distinct
   role addition, not a renaming of this one.
4. **New `cash_ledger` table** — `siteId`, `type` (`manual_in` | `manual_out`),
   `amountAed`, `note`, an optional `relatedBookingId`, `recordedByStaffId`,
   `recordedAt`. Booking revenue keeps deriving from `bookings.aed`
   unchanged (`docs/adr/0007`) — this table only covers cash movements a
   booking row can't represent. A ledger *view* is booking-derived revenue
   rows unioned with `cash_ledger` rows, not a duplicate of booking data.
5. **Seeded via the existing env-var pattern**, not a hardcoded credential.
   `db/seed.ts` gains an optional block gated on `SEED_SUPERADMIN_EMAIL` /
   `SEED_SUPERADMIN_PASSWORD` / `SEED_SUPERADMIN_NAME` — mirrors
   `SEED_MANAGER_*` exactly. Unset, the block is skipped; nothing about this
   ADR requires re-running the manager seed path.
6. **`audit_action` enum gains** `booking_rescheduled`, `booking_reassigned`,
   `site_created`, `staff_site_assigned`, `cash_entry_recorded` — the new
   mutations this and the following phases add all write through the
   existing `lib/audit.ts` `logAudit()` helper, same as every other action.

## Consequences

- Every existing query that assumes `staff.siteId` is non-null (site-scoped
  dashboards, rosters, member scoping) is written for `coach`/`studio_manager`
  callers and never receives a superadmin session — no existing query needed
  to change, but any *new* superadmin-facing query must handle `siteId` being
  absent explicitly (iterate `sites`, don't assume one).
- No real payments/POS system is introduced by the `cash_ledger` table — it
  is a manual ledger, not a transaction processor. A real POS stays
  blueprint Phase 2 and, per the "Booking and POS are ours" Iron Rule, an
  in-house build when it happens, not a third-party dependency now.
- `staff_role`, `booking_status`, and `audit_action` are all Postgres enums;
  adding a value is a schema migration (`ALTER TYPE ... ADD VALUE`), applied
  via `drizzle-kit push` like every prior schema change in this tree — no
  new migration tooling.
