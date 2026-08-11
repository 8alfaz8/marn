# 0016 — Credit ledger: append-only, derived balance, replaces `members.credits`

**Status:** Accepted
**Date:** 2026-08-12

## Context

Blueprint §9.4 names the exact failure mode this decision exists to avoid:
"the alternative — a `sessions_remaining` integer that gets edited — is
where booking systems' data integrity reliably dies, and the first billing
dispute in month eight is when you find out." `members.credits` (Phase 1)
is exactly that integer. Appendix D's prompt D3 gives the authoritative
entry-type list and names three required test cases (double-spend, expiry
at a boundary, refund after consumption) — a real schema decision with
real cost to reverse once real money is flowing through it, so it gets an
ADR per `CLAUDE.md` even though it was already scoped in the approved plan.

## Decision

`credit_ledger` (`db/schema.ts`): append-only, one row per movement, eight
entry types exactly matching the blueprint's list — `purchase`,
`consumption`, `expiry`, `freeze`, `unfreeze`, `refund`, `gift`,
`corporate_grant`. `credits` is a signed integer; a member's balance is
`sum(credits)`, computed on every read (`getMemberCreditBalance`/
`getMyCreditBalance`, `lib/actions/creditLedger.ts`), never stored
anywhere. `members.credits` (the old integer) is left in place, unused —
pre-existing column, mention don't remove per `CLAUDE.md`, same treatment
`setMemberParqCleared` got when PAR-Q screening superseded it.

**Booking writes to the ledger; booking is not gated by it.** This pass
deliberately separates two decisions that are easy to conflate:
`createSelfBooking` always writes a `consumption` entry (accounting is
unconditional), but does not check balance first (the gate is deferred,
per the structured question this was resolved with — see
`docs/decisions.md`, 2026-08-12). A negative balance is therefore a valid,
correctly-recorded state this pass, not a bug — verified directly in
`scripts/test-creditLedger.ts`'s double-spend case.

**Two automatic entries have no staff actor**: a booking's `consumption`
entry and a cancellation's `refund` entry both have `recordedByStaffId:
null` — same reasoning as `members.addedByStaffId` being null for
self-registration. A studio manager's own actions (`purchasePackage`,
`recordLedgerAdjustment`) always carry `recordedByStaffId` and are
audit-logged (`credit_purchase_recorded`, `credit_adjustment_recorded`).

**Cancellation policy (blueprint names as unspecified, docs/decisions.md
records the numbers chosen): 24 hours' notice.** `cancelSelfBooking`
computes hours-until-appointment; ≥24h writes a `refund` entry, <24h
writes nothing (forfeited). A studio manager *declining* a self-booking
always refunds unconditionally — the member did nothing wrong.

## Consequences

- No credit-balance gate on self-booking yet — a freshly self-registered
  member can book with zero or negative balance. This is the explicit,
  user-confirmed trade-off for keeping the just-shipped self-booking flow
  testable without first requiring a studio manager to grant credits.
  Gating it is the natural next step, flagged in
  `docs/architecture/overview.md`, not silently deferred.
- No self-checkout: `purchasePackage` is `requireStudioManager()`-only.
  Combined with `docs/adr/0015`'s payment interface, a member cannot buy
  credits without a staff member present — correct for a manual-charge
  world, a real constraint to revisit once a real gateway exists.
- Balance is always a query, never a stored field — every read does a
  `sum()` over `credit_ledger`. Acceptable at pilot volume; worth an
  indexed materialized view only if this ever shows up as a real query
  cost, not before.
