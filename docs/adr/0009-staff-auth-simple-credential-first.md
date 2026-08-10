# 0009 — Staff auth: simple credential now, phone-OTP before member auth

**Status:** Accepted (known, temporary gap — same pattern as `docs/adr/0002`)
**Date:** 2026-08-11

## Context

The blueprint specifies `better-auth`, self-hosted, phone-OTP primary, for
both member and staff identity (§10.1, the Auth row in the stack table).
Phase 1's goal list names "coach authentication" without pinning the
credential method. Real phone-OTP needs an SMS provider — a new vendor
touching member/staff data, which `CLAUDE.md`'s Iron Rules treat as an ADR
in its own right, not a config change — and meaningfully more setup than
this first slice needs to prove out the coach and studio-manager consoles.

Confirmed by direct quiz on 2026-08-11: start with a simpler credential for
staff login now; phone-OTP becomes the fast-follow before member
authentication (Phase 2), which is when the blueprint's phone-OTP choice
actually starts carrying weight (member-facing signup, not a small internal
staff roster).

## Decision

Use `better-auth`'s built-in email + password provider for staff
(coach/studio-manager) login in this slice — no custom credential scheme,
no SMS vendor decision yet. `better-auth` itself is unchanged from the
blueprint's choice; only the credential method is staged. Staff identity
stays a separate `better-auth` instance/table set from where member auth
will eventually live, per blueprint §10.1's "separate identity domains for
members and staff."

## Consequences

- No SMS/OTP vendor selection or ADR needed yet — deferred until member auth
  (Phase 2) actually requires it.
- Staff passwords need the standard handling `better-auth` already provides
  (hashing, rate limiting on login) — not reinvented here.
- Before Phase 2 member authentication work starts, revisit this ADR: either
  extend the same `better-auth` instance with a phone-OTP provider for
  staff too (for consistency), or leave staff on email+password permanently
  and only put members on phone-OTP — that choice isn't made yet and
  shouldn't be assumed either way.
- Real fix / full spec: phone-OTP via `better-auth`, matching §10.1 exactly,
  once an SMS vendor is chosen and its own ADR lands.
