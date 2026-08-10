# 0007 — Root product schema shape (Phase 1 staff-side slice)

**Status:** Accepted
**Date:** 2026-08-11

## Context

The repo root held no schema at all — `docs/adr/0005-prototype-product-split.md`
deliberately left the real product's `db/` empty, on the basis that the
prototype's schema cuts corners (no per-measurement provenance, no real
roles) that the real build should not inherit even where it copies the UI
shape.

The team is starting the first vertical slice of the real product: the coach
console and a new studio-manager console (`docs/adr/0008`), staff-side only —
no member authentication, payments, or self-service booking yet (those stay
blueprint Phase 2, §11). Schema shape is called out in `CLAUDE.md`'s Workflow
section as one of the decision types that gets an ADR, so this is that ADR
rather than a silent schema drop.

## Decision

`db/schema.ts` — 11 tables, plain Postgres (`drizzle-orm/postgres-js`, no
Neon-specific types), matching `CLAUDE.md`'s "plain Postgres, portable" Iron
Rule:

- `sites`, `staff` (role enum `coach` | `studio_manager`, scoped to a site),
  `members` (roster, added by staff — no self-signup yet).
- `flags` — persistent, human-cleared safety flags (Iron Rule: no automatic
  expiry).
- `assessments` + `measurements` — the blueprint's canonical model (§5.2),
  one row per measurement. Every `measurements` row carries the full
  provenance set the Iron Rules require (`source`, `instrument`,
  `protocol_version`, `measured_at`, `measured_by`) — the prototype's
  `measurements` table has none of this (see
  `docs/architecture/overview.md`'s Measurement domain deviations); the real
  build does not repeat that gap.
- `checkins`, `sessions` (member-facing `memberSummary` modeled `notNull` —
  enforcement of "the API rejects a session without one" still needs to live
  in the write path, not just the column constraint, when session logging is
  built).
- `bookings` — manual entry only in this slice, `coachId` nullable until a
  studio manager assigns one on approval, `aed` as a plain integer revenue
  proxy. There is no `services` table (mirrors the prototype's own choice of
  a bare `serviceId` text column) — a real service/price catalog is
  Administration territory (blueprint §4.4, P2/P3), not needed to ship
  manual booking entry.
- `shifts` — studio-manager-assigned staff scheduling. Not a blueprint-named
  entity; new for this slice (see `docs/adr/0008`).
- `audit_log` — append-only, action + entity reference only, never the
  underlying health-data content (Iron Rule: health data never enters logs).

Auth credentials are deliberately **not** in this schema — they live in
better-auth's own tables (`docs/adr/0009`), joined to `staff` by
`authUserId`, keeping identity and business-domain data separate per
blueprint §10.1.

## Consequences

- No `credits`, `payments`, or member-auth tables yet — those are blueprint
  Phase 2 and out of scope for this slice.
- `db/drizzle.config.ts` lives at the repo root (not inside `db/`, unlike the
  prototype's `prototype/db/drizzle.config.ts`) because `drizzle-kit` only
  auto-discovers `./drizzle.config.ts` relative to the current working
  directory — the prototype's placement only works if its scripts are always
  invoked with an explicit `--config` flag, which they aren't; not fixing
  that pre-existing prototype quirk here, just not repeating it.
- A checked-in migration (`drizzle/0000_thankful_invaders.sql`) exists from
  `npx drizzle-kit generate` against this schema; no database has been
  pushed to yet — no `DATABASE_URL` exists at the repo root. Whoever runs
  `npm run db:push` next needs to supply a fresh Postgres instance (not the
  prototype's Neon project — that stays prototype-only, never real member
  data) via a root `.env`.
