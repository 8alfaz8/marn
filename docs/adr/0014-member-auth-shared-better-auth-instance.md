# 0014 — Member authentication reuses the staff better-auth instance

**Status:** Accepted
**Date:** 2026-08-12

## Context

Blueprint Phase 2 (§11) needs member authentication. The blueprint doesn't
specify a mechanism; the user picked email+password over phone+OTP after a
trade-off discussion (recorded in `docs/decisions.md`) — OTP would need a
new SMS vendor decision (an ADR of its own, deferred) where email+password
reuses code already live and verified for staff.

That still leaves an architecture question this ADR answers: does member
auth get its own better-auth instance (separate cookie, separate session
table, separate `/api/member-auth/[...all]` route), or does it reuse
`lib/auth.ts`'s existing instance? Auth/security decisions constrain the
future and get their own ADR per `CLAUDE.md`, regardless of how the
credential-method question was resolved.

## Decision

**One better-auth instance, shared.** `lib/auth.ts`'s `betterAuth()` config
is unchanged — `emailAndPassword: { enabled: true }` already covers both
domains. Members get their own domain table (`members.authUserId`, a plain
unique text column, not a DB foreign key — same pattern as
`staff.authUserId`, joined to `user.id` at the application layer only,
`db/schema.ts` and `auth-schema.ts` staying independent files) instead of a
second auth stack.

"Separate identity domains" (blueprint §10.1 — "a coach account is never a
member account with a flag set") is enforced by **two disjoint resolvers**
over the one session table, not by two session tables:

- `lib/authz.ts`'s staff resolvers require a `staff` row for the session's
  `authUserId`.
- `lib/memberAuth.ts`'s `getMemberSession()` requires a `members` row for
  the same `authUserId`.

A person who is only staff (or only a member) is correctly rejected by the
other resolver. Nothing about a `staff` row grants access to member-gated
actions, or vice versa — the check is "does a row exist in *this* domain
table," not "is this the same session."

## Consequences

- **No new dependency, no new plugin, no new route.** `app/api/auth/[...all]/route.ts`
  serves both domains already. This is the smallest change that satisfies
  "separate identity domains" — a second better-auth instance would add a
  second cookie, a second route, and a second config to keep in sync, for
  a guarantee the resolver-per-domain pattern already provides.
- **Accepted edge case, not fixed:** the same browser signed in as staff
  and then visiting a member route (or vice versa) carries the wrong
  domain's session cookie into the other surface. The resolver for that
  surface correctly finds no matching row and treats it as signed-out —
  safe, just a mildly confusing dead end for a person testing both roles
  in one browser (verified live, not just assumed — see
  `docs/decisions.md`, 2026-08-12). Not worth a second auth stack to avoid
  a UX quirk that never affects a real user (no one is both staff and a
  member of the same studio in the pilot's actual usage).
- **Self-registration cannot be audit-logged.** `audit_log.actorStaffId`
  is a non-null foreign key to `staff`; a member registering themselves
  has no staff actor. `members.createdAt` is the record instead — this is
  a scope boundary (audit_log tracks staff actions on member data), not a
  gap to close later.
- If member auth ever needs to diverge meaningfully from staff auth (a
  different session lifetime, a different plugin, a different trusted-origin
  policy), that's the reversal point for this decision — split into a
  second instance then, not preemptively now.
