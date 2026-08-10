# 0008 — Studio manager console: booking approval moves off the coach, capacity/earnings pulled into Phase 1

**Status:** Accepted
**Date:** 2026-08-11

## Context

The blueprint already names a studio-manager role (§10.2: "Coach, plus
roster, capacity, credits and pricing at their site") and lists studio
managers as coach-console users (§4.2 intro table), but never gives the role
its own console or surface — booking confirm/decline/reassign sits inside
the coach console's request inbox (§4.2.2), and capacity/utilisation
reporting (§4.2.8) and Administration (§4.4, roster/pricing/credit admin)
are both P3/P2 — deliberately sequenced after the pilot.

Kicking off the first real vertical slice (coach console + a new studio
manager console, ahead of the member-facing app per the blueprint's own
sequencing rule "coach console before member app, always"), the product
owner asked for a firmer split than the blueprint currently draws: a named
studio manager who sets staff shifts, approves every customer booking, and
watches store earnings, capacity, staff/member details and floor activity —
while a coach sees only their assigned members' check-in data, past session
data, and session-necessary context, explicitly **not** contact or payment
details. Confirmed by direct quiz on 2026-08-11 (see `docs/decisions.md`):
booking approval is studio-manager-exclusive, not coach-with-manager-
oversight, and this first slice is staff-side only — no member portal yet.

## Decision

1. **Booking approval moves off the coach console.** Confirm/decline/
   reassign (blueprint §4.2.1/§4.2.2) becomes a studio-manager-console
   function exclusively. A coach's schedule view is read-only against
   already-approved bookings — a real, if modest, divergence from §4.2.2's
   "coach console" framing and from §10.2's "coach, plus" phrasing (which
   reads as the manager having *additional* access on top of the coach's,
   not replacing part of it).
2. **Coach data access is scoped down.** A coach's member-record read path
   returns only members with a session or upcoming booking assigned to that
   coach, at their site, and **excludes** contact fields (phone/email) and
   any credit/payment data — enforced server-side at the query layer (Iron
   Rule: "authorization is server-side, always"; a UI-level hide is not
   sufficient). The studio manager's read path is unrestricted at their
   site, matching §10.2's "coach, plus" framing for everything *except*
   booking approval.
3. **Shift assignment** is a new studio-manager function — not
   blueprint-named. Backed by the new `shifts` table (`docs/adr/0007`).
4. **Store earnings and capacity** are pulled into this Phase 1 slice for
   the studio manager, ahead of the blueprint's own P2/P3 sequencing for
   Administration (§4.4) and capacity/utilisation (§4.2.8) — the same kind
   of out-of-sequence pull the prototype already did once for Administration
   (`docs/architecture/overview.md`, Administration deviations: "built now,
   ahead of that sequencing, specifically to give business data somewhere to
   live"). Scoped deliberately lightly for this pass: session counts,
   `bookings.aed` summed as a revenue proxy, and a simple booked/available
   slot ratio per day — not the blueprint's fuller P3 coach-outcome metrics
   (§4.2.7) or waitlist-driving utilisation detail (§4.2.9), and not a real
   payments/POS system (`credits`/payment tables are still out of scope per
   `docs/adr/0007`).

Blueprint §4.2.1, §4.2.2, and §10.2 are amended in the same change as this
ADR (short cross-reference notes, not a rewrite) to point here rather than
silently drifting from the shipped behavior.

## Consequences

- Two staff-facing surfaces with different route trees are needed
  (`/coach`, `/studio`), each authorized to its own role — not a shared
  screen with client-side role branching.
- The role matrix enforcement (blueprint §10.2, "assumed hostile" client-side
  checks) now has one more asymmetry to encode: studio manager is *not*
  simply "coach plus more" for booking approval, it's "coach minus booking
  approval, plus everything else." Whoever builds the authorization layer
  next needs to encode this per-capability, not as a single role-hierarchy
  check.
- If a later phase decides coaches should regain booking confirm/decline
  (reverting closer to §4.2.2 as written), that's a reversal of this ADR,
  not a silent behavior change — flag it as such.
- Capacity/earnings being "lightweight for now" means the studio-manager
  dashboard will visibly under-deliver against the blueprint's eventual P3
  spec (coach outcome metrics, waitlist fill) — expected, not a defect,
  until those phases are reached.
