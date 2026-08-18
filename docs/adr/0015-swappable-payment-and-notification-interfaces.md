# 0015 — Payments and notifications behind swappable interfaces, no real send

**Status:** Accepted
**Date:** 2026-08-12

## Context

Blueprint Phase 2 needs payments (§9.4) and push/WhatsApp notifications
(§9.3). Both need real vendor accounts this session doesn't have: a
payment processor (§9.4 marks Stripe/Network International/Telr/Tabby/
Tamara as candidates, explicitly not a decision — "OPEN, deferred by
decision"), and for notifications, Expo push credentials plus a WhatsApp
Business Solution Provider with an approved sender number and message
templates (§9.3: "template approval takes days to weeks and is a common
launch-blocker"). Real money movement also carries PCI-DSS scope this
environment has no posture for. The user confirmed both should be built
against a swappable interface rather than deferred outright or guessed at
with a named vendor and no credentials.

## Decision

Both mirror `lib/integrations/bodymap/index.ts`'s existing shape exactly —
a port (plain exported types/functions, not a class) with one working,
non-real implementation and the real-vendor paths present as typed stubs
that throw a descriptive error rather than being omitted:

- `lib/integrations/payments/index.ts` — `chargeManual` (implemented:
  records that payment was collected outside the system) is what every
  package sale in this codebase actually calls. `chargeStripe`/
  `chargeUaeGateway` are stubs.
- `lib/integrations/notifications/index.ts` — `notifyRecorded`
  (implemented: writes a `notifications` row) is what every trigger point
  actually calls. `notifyExpoPush`/`notifyWhatsApp` are stubs.

**The `notifications` table is new** — not blueprint-named (absent even
from Appendix A's own "not yet built" list). A "recording" implementation
needs somewhere real to record to; the Iron Rule against member
identifiers in logs applies to a notification record exactly as it does
to any other log-adjacent surface, so this could not be a `console.log`.
`payload` is a jsonb column callers populate with booking/schedule-shaped
data only — enforced by convention at each call site (six trigger points:
booking requested/confirmed/declined/cancelled, readiness cleared/
referred, welcome), not by a schema constraint, same trust level as
`cash_ledger.note` or `audit_log`'s existing free-text fields.

## Consequences

- **No package can be sold to a member without a human collecting real
  payment first**, and no member-facing self-checkout exists — the swap
  point in `purchasePackage` (`lib/actions/creditLedger.ts`) is
  `chargeManual`; replacing it with a real gateway is a one-file change in
  `lib/integrations/payments`, not a rewrite of the ledger, the studio
  console UI, or the authorization gate (`requireStudioManager`, unchanged
  by a future swap).
- **No notification a member sees today actually arrives anywhere** — the
  `notifications` table is a correctness record (right trigger, right
  data, right member), not a delivery guarantee. There is deliberately no
  inbox UI reading it this pass; building one before a real channel exists
  would suggest functionality that isn't there.
- Both stubs throw rather than silently no-op, matching the BodyMap
  adapter's own precedent — a future caller that reaches for
  `chargeStripe`/`notifyWhatsApp` before the real integration lands gets a
  clear, immediate error instead of a mysteriously absent charge or
  message.
