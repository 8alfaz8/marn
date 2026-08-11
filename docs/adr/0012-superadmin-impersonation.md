# 0012 — Superadmin impersonation ("view as") via a re-verified act-as cookie

**Status:** Accepted
**Date:** 2026-08-11

## Context

With three staff roles (`docs/adr/0011`), checking how a change lands for a
coach or a studio manager meant signing out of the superadmin account,
signing in as that person, checking, and signing back — several times per
change. The product owner asked for a dropdown of staff accounts that
switches the whole console to that identity: "dashboard shows as if I am
that person," not a read-only preview.

Impersonation is an authorization feature, so it gets an ADR rather than
being folded quietly into a UI change (`CLAUDE.md`: anything touching
auth/security is confirmed before building, and constrains the future).

## Decision

1. **An httpOnly `marn_act_as` cookie holding a target `staff.id`**, set only
   by a server action gated on the *real* session being an active superadmin.
   The cookie is never read or written by the browser.
2. **The cookie grants nothing on its own.** `getStaffSession()` honours it
   only when that same request also carries a better-auth session resolving
   to an active `superadmin` staff row. A forged or stolen cookie without a
   superadmin session is ignored entirely. The check re-runs from scratch on
   every request against the live `staff` row, so deactivating either account
   ends the impersonation immediately — there is no impersonation session to
   invalidate.
3. **Only active coaches and studio managers are impersonable.** Never
   another superadmin: acting as a peer would gain no access that isn't
   already held, while making "who really did this" ambiguous. Because the
   target is always a *narrower* role, impersonation can only ever reduce
   what the acting superadmin can reach — it is never a privilege-escalation
   path, only a privilege-*restriction* one.
4. **Two session resolvers, deliberately.** `getRealStaffSession()` returns
   the signed-in human, ignoring impersonation; `getStaffSession()` returns
   the *effective* identity the app behaves as. Everything governing
   impersonation itself uses the real one — while acting as a coach the
   effective session reports `role: 'coach'`, so gating the "stop" control on
   the effective session would strand the superadmin with no way back.
   Everything else in the app keeps calling `getStaffSession()` unchanged.
5. **Writes are allowed while impersonating**, and domain rows are attributed
   to the borrowed identity. This follows from the requirement (a read-only
   preview would not answer "how does the app respond to them"). The audit
   trail is what keeps it honest: the switch itself is logged with the **real
   superadmin** as `actorStaffId` (new `staff_impersonated` value on the
   `audit_action` enum), bracketing everything that follows, so any action
   during an impersonation window can be traced back to the human who
   actually took it.
6. **The borrowed identity is always visible** — a persistent banner naming
   the account plus a one-click exit, on every console, not a subtle chrome
   change.

## Consequences

- `StaffSession` gains an `impersonatedBy` field (null in the normal case).
  Existing call sites ignore it; nothing else changed shape.
- Domain writes made while impersonating are indistinguishable *in the domain
  tables* from ones the staff member made themselves — reconstructing them
  requires reading `audit_log` for the surrounding `staff_impersonated`
  entries. Acceptable for an internal, small-team tool; if this ever needs to
  be self-evident from the row itself, that's an `impersonated_by` column on
  the affected tables and a reversal of point 5, not a tweak.
- Impersonation is a **production-capable** feature, not a dev-only one — it
  ships with the same code path everywhere. If that becomes undesirable, gate
  it on an env flag; don't rely on it being unreachable.
- No new dependency, no session-table change, no better-auth plugin. The
  alternative considered was better-auth's `admin` plugin, whose
  impersonation is user-level and carries its own `role`/`banned` columns —
  a poor fit here, where roles live in `staff` rather than `user`, and a
  larger schema migration for less control.
