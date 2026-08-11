# 0013 — Phase 1 member portal access via a staff-issued link, not member auth

**Status:** Accepted
**Date:** 2026-08-11

## Context

Blueprint Phase 1 (§11) lists "member web portal, read-only — scores, body
map, progress, session summaries" as part of the pilot slice, with the exit
criterion "every member can see their results." Member authentication,
however, is explicitly Phase 2, alongside self-service booking and payments.
Building the portal therefore means deciding what stands in for member auth
for one phase, without building the real thing early — a member-visible
identity decision with real cost to reverse, so it went through the
structured question tool (`CLAUDE.md`: "genuine fork... ask, as options plus
a recommendation") rather than being decided silently. The user picked the
recommended option below.

## Decision

A staff-issued, revocable read-only link is the only way into the member
portal this phase:

1. **`member_access_tokens`** (`db/schema.ts`) — one row per issued token:
   `token` (the credential itself, a 24-byte random value, base64url-encoded,
   `crypto.randomBytes`), `memberId`, `createdByStaffId`, `createdAt`,
   `revokedAt`/`revokedByStaffId`. No `user`/session-table involvement at
   all — this is deliberately not a lightweight version of better-auth.
2. **The token is the sole credential.** `app/m/[token]/page.tsx` and
   `lib/actions/memberPortal.ts`'s `getMemberPortalData` take no session,
   cookie, or client-supplied identity beyond the URL segment — every load
   re-checks the token against the live table, so revoking it (or minting a
   new one) takes effect on the member's very next request, no session to
   invalidate.
3. **One live token per member.** `generateMemberAccessLink` (studio console
   only, `lib/actions/memberAccess.ts`) revokes any existing active token for
   that member before minting a new one. A leaked link is invalidated by
   generating a fresh one — there is no separate "revoke, then reissue"
   two-step required, though `revokeMemberAccessLink` exists for "disable and
   don't reissue yet."
4. **Studio console only, not coach console.** Only the studio manager's
   member roster carries phone/email to actually hand the link to a member
   (`docs/adr/0008` scopes contact fields away from coaches); putting the
   generation control anywhere a coach could reach it would create a control
   with no way to act on it.
5. **Every generate/revoke is audit-logged** (`member_access_link_created`,
   `member_access_link_revoked` on `audit_action`) against the acting staff
   member and the member's id — never the token value itself, matching the
   Iron Rule that health data (and here, a live credential) never lands in a
   log-adjacent record.

## Consequences

- No password, no OTP, no account recovery flow to build for members this
  phase — correctly scoped to what Phase 1 actually needs.
- The link is a bearer credential: anyone holding the URL can view that
  member's scores and session history until it's revoked or replaced.
  Acceptable for a read-only, non-financial surface handed out by staff
  directly (in person or via a channel the studio already trusts), not
  acceptable to extend to anything that writes data or touches payments —
  that boundary is what makes pulling real member auth forward in Phase 2 a
  clean superset rather than a rework: `member_access_tokens` and this action
  set can simply stop being used once member accounts exist, with no schema
  change required to retire them.
- No rate limiting or expiry on tokens yet — matches the blueprint's own
  "OPEN" posture on operational hardening for pieces explicitly marked
  pilot-only; worth revisiting before this leaves a single-studio pilot.
- Alternative considered and rejected: pulling member authentication forward
  from Phase 2 now. Rejected because it's substantially more scope (sign-up,
  session management, password/OTP delivery) for a Phase 1 slice whose exit
  criterion only requires that members can *see* their results, and because
  the blueprint's own sequencing rule ("no feature ships to members before it
  works on the floor") argues for keeping the member-facing surface area
  minimal until the staff-side console has had real floor use.
