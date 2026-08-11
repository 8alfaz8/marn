# 0017 — Mobile app: separate Expo workspace, bearer-token auth, thin REST layer

**Status:** Accepted
**Date:** 2026-08-12

## Context

Blueprint Phase 2 wants "mobile app, iOS first with Android within three
weeks." The user chose to scaffold a real React Native app now rather than
defer it. Two architecture questions this ADR answers: where the code
lives, and how it authenticates — React Native cannot share the browser's
session cookie the way the web member console does.

## Decision

**Workspace: `mobile/` at the repo root**, sibling to `prototype/` — same
precedent as that split (`docs/adr/0005`): an independent tree with its
own `package.json`, not folded into the Next.js app's dependency graph.
Expo + TypeScript, `expo-router` for file-based navigation — the closest
mental model to the Next.js App Router already used everywhere else in
this repo, so the same person can move between them without relearning a
routing paradigm.

**Auth: better-auth's bearer plugin, added to the existing shared instance**
(`lib/auth.ts` — the same instance `docs/adr/0014` established for web
member auth, staff auth unaffected). A sign-in response then includes a
bearer token; the RN app stores it in `expo-secure-store` and sends
`Authorization: Bearer <token>` instead of relying on a cookie. This is
additive only — the plugin doesn't change the web cookie flow for staff or
web members, it adds a second, parallel way to authenticate against the
same session mechanism.

**A new thin REST layer** (`app/api/mobile/*/route.ts`, Next.js route
handlers — not server actions, which aren't a stable contract for an
external HTTP client) wraps the *exact same functions* the web member
console already calls (`getMyPortalData`, `getMemberOwnBookings`,
`createSelfBooking`, etc.). Each route reads the bearer token instead of a
cookie via better-auth's own verification, then resolves the same
`members` row `getMemberSession` already knows how to find. No business
logic is duplicated — only the auth entry point and the HTTP↔function
boundary are new.

**RN screens deliberately mirror the web member console's feature set
exactly** (sign-in, sign-up, Overview, Book, My bookings, Programme,
Check-in) — no new business logic to invent for this pass, only a new
presentation layer over already-designed, already-verified functionality.

## Consequences

- **Verification constraint, stated plainly rather than glossed over**:
  this is a Windows development environment with no Xcode, no iOS
  Simulator, and no Android Studio/SDK installed. Real-device or simulator
  verification is not possible here. Verification is `npx tsc --noEmit`
  inside `mobile/`, Metro bundler starting without error, and Expo's web
  target (`expo start --web`, React Native components rendered via
  react-native-web) screenshotted the same way the Next.js app's browser
  verification works. This is a real rendering check, not a simulated
  one — but it is not the same as confirming the app behaves correctly on
  an actual phone, and that gap should be closed before this ships to a
  real device, not assumed away.
- A second identity-resolution path (bearer, alongside cookie) now exists
  against the same better-auth instance. It only ever narrows to the same
  `members`/`staff` row lookups already in place — no new privilege path,
  same authorization functions underneath.
- If the mobile app's needs ever diverge meaningfully from the web member
  console (offline support, background sync, push-token registration
  requiring its own state), that data belongs in `mobile/`'s own storage,
  not retrofitted into the web-facing schema — this ADR's scope is the
  transport and workspace decision, not a commitment to keep mobile and
  web permanently feature-identical.
