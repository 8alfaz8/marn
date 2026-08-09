# 0001 — PAR-Q stays self-service, auto-clearing

**Status:** Accepted (deliberate exception to a CLAUDE.md Iron Rule)
**Date:** 2026-08-09

## Context

`CLAUDE.md`'s Iron Rules state: "A PAR-Q flag or coach-raised concern gates the affected activity until a named person clears it, with who and when recorded. No automatic expiry, no clearing on the member's own say-so."

At the same time, a reported prototype bug was that no PAR-Q UI existed at all — new members were permanently blocked from booking a session, since the only path to clearance was a coach manually flipping a flag in the coach console, with no self-service alternative and no interactive questionnaire on either side.

## Decision

The self-service PAR-Q flow was built anyway: a member completes the questionnaire themselves (`components/ParqForm.tsx`), and the system auto-clears them (`POST /members/:id/parq/submit`) unless a red-flag answer is given, in which case it hard-blocks with a referral message ("see a physician before your first session") rather than clearing them — this red-flag hard-block matches the blueprint's "referral gate, not liability form" stance (`marn-blueprint.md` §1.5, §4.1.10) even though the *clearing* mechanism itself doesn't match CLAUDE.md's "named person" requirement.

This was confirmed explicitly with the product owner after the conflict was surfaced, not decided unilaterally.

## Consequences

- A member who answers "no" to every question clears themselves with no coach ever reviewing it. If PAR-Q answers turn out to need more scrutiny than a simple red-flag check (e.g. borderline answers, inconsistent answers over time), this will need a coach-review queue.
- Revisit once a coach-review step is worth the added friction against new-member conversion — e.g. once volume is high enough that inter-coach measurement variance (blueprint §2.4) becomes the bigger product risk than onboarding friction.
- The exception is scoped narrowly to PAR-Q *clearing*. Coach-raised safety flags (contraindications noted during a session) are unaffected and still require a coach to clear them (`components/Coach.tsx` / `components/Admin.tsx`, "Mark PAR-Q cleared" / flag-clear actions).
