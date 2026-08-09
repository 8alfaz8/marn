# 0002 — Real routes now, real authorization later

**Status:** Accepted (known, temporary gap)
**Date:** 2026-08-09

## Context

`CLAUDE.md`'s Iron Rules require: "Authorization is server-side, always. Every read and write is authorized in a server action or route handler against the session's role... A member id supplied by the client is an input to validate, never a fact."

The prototype has no auth system — no passwords, no sessions, no server-side role checks anywhere in `app/api/[...path]/route.ts`. That's the blueprint's Phase 2 (`marn-blueprint.md` §11, phone-OTP via `better-auth`, D4 in Appendix D), not something in scope for the current bug-fix + Material UI migration pass.

This pass did introduce real Next.js routes (`/`, `/member`, `/coach`, `/admin`) replacing the previous single-page client-state app, which needed *some* way for a server component to know "who" is asking before rendering a route.

## Decision

Added `lib/session.ts` + `app/api/session/route.ts`: an httpOnly cookie (`marn_who`) set by the existing no-password persona picker (`components/Gate.tsx`), read server-side via `getIdentity()` in each route's `page.tsx` to decide what to render or whether to redirect to `/`.

This is explicitly **not** authorization. Anyone can `POST /api/session` with any `{kind, id}` and become that identity — same trust model the prototype already had (client-supplied `coachId`/`memberId` on every write), just now backed by a cookie instead of in-memory React state. Coach-side data scoping (`lib/reference.ts`'s `scopeSnapshotForCoach`) is similarly client-side only — a coach with dev tools open can still see the raw `/api/snapshot` response.

## Consequences

- `GET /api/snapshot` still returns the entire unscoped database to anyone who calls it directly — scoping happens in the UI layer (`Coach.tsx`), not the API.
- Every route handler in `app/api/[...path]/route.ts` still trusts client-supplied `memberId`/`coachId` values as fact.
- Real fix: build the blueprint's Phase 2 auth (phone-OTP, `better-auth`, separate member/staff identity domains per blueprint §10.1), then enforce the full role matrix (§10.2) server-side on every route, and make `GET /snapshot` scoped and paginated (already flagged as a pre-existing prototype convenience in `marn-blueprint.md` Appendix B).
