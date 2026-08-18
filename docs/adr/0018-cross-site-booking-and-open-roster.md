# 0018 — Members can book any studio; staff access to member data is no longer site-gated

**Status:** Accepted
**Date:** 2026-08-19

## Context

Product owner feedback (batch UI/UX review, 2026-08-19): "all members should
be able to book any studio they want." Today a member's `siteId` is fixed at
registration and every booking silently inherits it — `createSelfBooking`
(root) and `POST /bookings` (prototype) both hardcode the booking's site to
the member's own, and `getMemberAvailability`/`getActiveCoachesAtSite`
(root) explicitly comment "always the member's own site, never a
client-supplied one."

Letting a member book anywhere raises the question the blueprint doesn't
answer (multi-site itself is nominally a Phase 3 item, §"Phase 3 — Depth":
"...multi-site...", already pulled forward once, `docs/architecture/
overview.md`'s Multi-site row, 2026-08-18): once a member can show up at any
of the three studios, can the coach or studio manager running that session
see the member's profile and history?

Quizzed directly (structured question tool, 2026-08-19), two decisions were
made explicitly, not inferred:

1. Booking is fully decoupled from a member's home site — not just "add a
   site picker to the booking form," but the member/coach/manager roster and
   directory relationships are meant to work across sites too, not only the
   booking write path.
2. Staff access to member data (root's `assertMemberInScope`,
   `lib/authz.ts`) becomes **open roster**: any active coach or studio
   manager, at any site, can read any member's profile and health data —
   explicitly chosen over a booking/session/screening-tie-gated alternative
   that would have preserved per-site isolation as a hard boundary while
   still letting a member roam. The rejected alternative was shown with its
   exact code shape before the choice was made.

## Decision

1. **`members.siteId` (both trees) is redefined as "registration/home site,"
   not "the only site this member can be served at."** It still exists and
   still drives one thing: the readiness-screening bootstrap (below). It no
   longer constrains where a member can book, and — per (2) — no longer
   gates whether a coach/studio manager can open that member's record.
2. **Booking write paths take a member/staff-supplied `siteId`,
   validated against the real site list, not derived from the member's
   `siteId` column.** `computeCoachAvailability`/`getMemberAvailability`/
   `getActiveCoachesAtSite` (root, `lib/actions/bookings.ts`) and the
   prototype's `POST /bookings`/`GET /availability` all take the chosen
   site as an explicit, server-validated parameter. `assertNoOverlap`'s
   guarantees (coach/member double-booking checks) are unchanged — they
   already keyed off the booking's own `siteId`/`coachId`, never the
   member's.
3. **`assertMemberInScope` (root, `lib/authz.ts`) drops the
   `member.siteId !== session.siteId` gate for every staff role.** A coach
   or studio manager can open any member's record, at any site, at any
   time — the booking/session/most-recently-screened narrowing that used to
   additionally restrict a *coach's* access (on top of the site gate) is
   also removed, since the chosen "open roster" option was explicit that
   access shouldn't depend on "whether they've ever interacted." This is a
   real reduction in defense-in-depth: a compromised or careless staff
   credential now reads every member in the company, not just one site's
   worth. Accepted deliberately, not a default — see Consequences.
4. **Readiness-screening discovery keeps a site filter, as a UX default,
   not a security gate.** `getCoachMembers`'s "any not-yet-screened member"
   branch stays filtered to the coach's own site (`members.siteId`):
   screening happens in person, at a physical location, so "every unscreened
   member in the company" showing up in every coach's queue everywhere
   would be noise, not access control (a coach could already open any of
   those records directly via (3) if they had a reason to). The
   booking/session-tie branch of the same roster query drops its site
   filter, since a booking can now be at any site.
5. **`getManagerMembers`/roster listings gain an explicit site filter,
   defaulted to the viewer's own site, same UX-not-security pattern as (4)
   and matching Administration's existing site-filterable precedent** —
   authorization no longer depends on it (per (3)), it exists so a roster
   screen doesn't dump the entire company's member list by default.
6. **Prototype gets the equivalent treatment** for parity, even though
   `docs/adr/0002` already means none of its site-scoping was a real
   security boundary to begin with (`lib/reference.ts`'s client-visible
   snapshot scoping) — the booking-site-picker and roster-filter UX changes
   still apply, since those are product behavior, not auth.

## Consequences

- Site isolation stops being a security property of the root product.
  Corporate-portal individual-data exposure (a separate Iron Rule) is
  unaffected — that rule is about corporate admins never seeing member-level
  data at all, regardless of site, and nothing here touches it.
- If a later phase needs per-site staff isolation back (e.g., a franchise
  model, or a compliance requirement naming it), that is a reversal of this
  ADR's point 3, not a silent behavior change.
- `members.siteId` carries two different meanings read together in one
  column now (home/registration site for screening discovery; historically
  also "the only site" before this change) — worth a dedicated column
  rename (`registeredSiteId`) if this proves confusing in practice, not done
  in this pass since the existing column already carries the right value
  for its one remaining purpose.
- The mobile app (`lib/mobileApi.ts`, `app/api/mobile/*`) calls the same
  server actions this ADR changes, so it inherits both the any-site booking
  and the open-roster read behavior without separate mobile-specific work —
  flagged here so it isn't mistaken for an oversight if not mentioned again.
