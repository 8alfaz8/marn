# Architecture overview

Module → code map and phase status. Status reflects what's actually in the
repo today, not the blueprint's roadmap — see `docs/blueprint/marn-blueprint.md`
for the aspirational shape. Keep this current: when a module's status changes,
update its row in the same change.

**Status key:** not started · in progress · done (done = the blueprint's P1
scope for that module is implemented; it does not mean "matches the full
blueprint spec").

**Repo split (2026-08-10, see `docs/adr/0005-prototype-product-split.md`):** the
disposable, no-real-auth build described by this table was relocated to
`prototype/` — every code path below is relative to `prototype/`, e.g.
"`components/Member.tsx`" is `prototype/components/Member.tsx`. The repo root
is now reserved for the real customer product and currently holds only a bare
Next.js + MUI shell (`app/layout.tsx`, `app/page.tsx`, `theme/theme.ts`) with
no feature code — every row below is **not started** from the root product's
point of view until it's rebuilt there against real auth and a real schema.
`docs/`, `CLAUDE.md`, and `AGENTS.md` stay at root and govern both trees.

| Module | What it does | Code path (under `prototype/`) | Status |
|---|---|---|---|
| Member app | Scores/progress, body map, booking, home programme, session history, PAR-Q | `components/Member.tsx`, `components/ParqForm.tsx`, `app/member/page.tsx` | **in progress** — see deviations |
| Coach console | Floor schedule, request inbox, assessment capture, session logging, flags, programme prescription | `components/Coach.tsx`, `app/coach/page.tsx` | **in progress** — see deviations |
| Corporate portal | Employer accounts, pooled credits, aggregate cohort reporting | — | **not started** — no route, no `organisations`/`orgMembers` tables, nothing in the schema |
| Administration | Studio overview, coach roster, member CRM, service/price/resource management, credit administration with audit trail | `components/Admin.tsx`, `app/admin/page.tsx` | **in progress** — see deviations |
| Measurement domain | Scoring engine, assessment/measurement capture | `lib/scoring.ts`, `db/schema.ts` (`assessments`, `measurements`), `lib/reference.ts` (`MUSCLES`) | **in progress** — see deviations |
| BodyMap adapter | Anti-corruption layer between the (unknown) BodyMap device format and the app's canonical measurement shape | `lib/adapters/bodymap.ts` | **in progress**, matches blueprint intent — `fromManualEntry` and the demo `simulateDeviceRead` work; `fromDeviceApi`/`fromExportFile` are stubs, correctly blocked on vendor contact info the team doesn't have yet |
| Booking & scheduling | Service-based booking, availability, confirm/decline | `app/api/[...path]/route.ts` (`/bookings`, `/availability`), `db/schema.ts` (`bookings`) | **in progress** — see deviations |
| Credits & payments | Session credit tracking, package purchase, payment processing | `members.credits` (plain integer column) | **not started** for anything the blueprint actually asks for — see deviations |
| Notifications | Push + WhatsApp booking/session confirmations | — | **not started** — API responses claim `notified: ['push','whatsapp']` but nothing is sent; see deviations |
| Identity / session | Who's using the app right now | `lib/session.ts`, `app/api/session/route.ts` | **prototype only** — a plain identity cookie, not authentication. See `docs/adr/0002-prototype-auth-gap.md` |
| Design system | MUI theme, tokens | `theme/theme.ts` (root: real brand tokens; `prototype/theme/theme.ts`: prototype's unrelated bone/ink palette), `docs/design/design-system.md` | **root: token layer done** (palette light/dark, Petrona/Figtree typography, shape/radius, focus ring, tabular numerals — sourced from `Marn wellness brand design system/`), **no screens built against it yet**; ambient wash and elevation shadows documented but not encoded (no consuming component). Prototype unchanged. |
| Hosting / data residency | UAE-region production hosting | — | **not started** — prototype runs on Vercel + Neon, which the blueprint explicitly allows only because it holds no real member data (§8.2) |

## Root product status (real build, not the prototype)

Started 2026-08-11: the first vertical slice at the repo root, staff-side
only (coach console, studio manager console, and — added later the same
day — a superadmin console spanning every site: `docs/adr/0008-studio-manager-role.md`,
`docs/adr/0011-superadmin-role-and-cash-ledger.md`), no member-facing UI
yet. Code paths below are relative to the repo root, not `prototype/`.
**Verified working end-to-end against a live database, browser-driven, at
every stage** — not just `tsc`/`build`: logged in as the seeded studio
manager, created a member and a coach account through the real UI, signed
in as that coach (both consoles render correctly with zero console errors);
separately, verified the booking-overlap guard, the shift-aware slot
picker, the floor-view day timeline and reschedule/reassign actions, the
member detail drawer, the superadmin console's cross-site dashboard and
cash ledger, and a full create-site → create-manager → sign-in-as-that-
manager → confirm-site-isolation loop — see `docs/decisions.md` entries
dated 2026-08-11 for what each check actually exercised. Database is Neon,
temporarily — `docs/adr/0010-neon-interim-production-database.md`.

| Module | Code path | Status |
|---|---|---|
| Schema | `db/schema.ts`, `db/auth-schema.ts`, `drizzle.config.ts`, `drizzle/0000_loud_namorita.sql`, `drizzle/0001_freezing_groot.sql`, `drizzle/0002_giant_beyonder.sql` | **done and pushed** — 16 tables live in the `marn-root` Neon project (`docs/adr/0007`, `docs/adr/0010`, `docs/adr/0011`, `docs/adr/0012`) |
| Staff auth | `lib/auth.ts`, `app/api/auth/[...all]/route.ts`, `db/seed.ts`, `app/login/page.tsx`, `lib/auth-client.ts` | **done and verified live** — `better-auth` email+password, staff-only identity domain. `db/seed.ts` bootstrapped the first studio manager (`manager@marn.studio`) and optionally a superadmin (`SEED_SUPERADMIN_*` env vars, unset by default); everyone else is created by an authenticated manager (`lib/actions/staff.ts`'s `createStaffAccount`, site-locked) or superadmin (`createStaffAccountForSite`, any site, never role `superadmin`) |
| Brand theme | `theme/theme.ts`, `app/layout.tsx` | **done, two real bugs fixed 2026-08-11** — `colorSchemeSelector` was set to the `'data'` shorthand (targets a boolean `[data-dark]` attribute) instead of the literal `'data-mui-color-scheme'` `InitColorSchemeScript` actually sets, and `ThemeProvider` was missing its own `defaultMode="dark"` prop (defaults to `'system'`, overwriting the script's attribute post-hydration). Both silently rendered light mode past `tsc`/`build` — only caught by an actual browser check. See `docs/decisions.md` |
| Authorization layer | `lib/authz.ts` | **done** — `StaffSession` is a discriminated union on `role` (`coach`/`studio_manager` carry a non-null `siteId`, `superadmin` carries `null`); `requireStaff`/`requireCoach`/`requireStudioManager`/`requireSuperadmin`/`requireStudioManagerOrSuperadmin` resolve the better-auth session to a `staff` row and gate by role, each returning a type-narrowed session so existing site-scoped call sites needed no changes. `assertMemberInScope` is the single enforcement point for the coach/manager/superadmin data split; `roleHome(role)` maps a role to its console route. Two resolvers: `getRealStaffSession()` (signed-in human) and `getStaffSession()` (effective identity, impersonation applied) — `docs/adr/0012` |
| Superadmin impersonation | `lib/actions/impersonation.ts`, `components/ImpersonationSwitcher.tsx`, `components/StaffChrome.tsx` | **done** — "View as" dropdown in the chrome switches the whole console to any active coach/studio manager. httpOnly `marn_act_as` cookie, re-verified against a live superadmin session on every request and worthless without one; only ever narrows access (superadmins aren't impersonable). Persistent banner + one-click exit; each switch audit-logged against the **real** superadmin (`staff_impersonated`). Writes during impersonation are attributed to the borrowed identity — see `docs/adr/0012` for that trade-off and its reversal point |
| Scheduling math | `lib/scheduling.ts` | **done** — pure functions (`computeFreeSlots`, `rangesOverlap`, `bookingRange`, etc.), no DB access; single source of truth for coach availability, reused by the overlap check, the slot picker, the day timeline, and coach workload. Tested via `scripts/test-scheduling.ts` (plain `assert`-style, run with `npx tsx` — no test-runner dependency added) |
| BodyMap adapter | `lib/integrations/bodymap/index.ts` | **done**, manual-entry only — `fromDeviceApi`/`fromExportFile` stubbed, matching the prototype's own precedent. Independently written, not a port (`docs/adr/0005`) |
| Data / server actions layer | `lib/actions/{members,bookings,assessments,sessions,flags,shifts,staff,dashboard,coachWorkload,cashLedger}.ts` | **done** for this slice — every action authorizes via `lib/authz.ts` first. `bookings.ts`'s `createBooking`/`rescheduleBooking`/`reassignCoach` share one transactional overlap guard (`assertNoOverlap`); see `docs/decisions.md` for the judgment calls made building all of it |
| Coach console | `app/coach/page.tsx`, `components/coach/*` | **done** — read-only today's schedule, roster scoped to assigned members (no contact fields) with an open-flag indicator at list level (2026-08-11, product owner request), one consolidated member-context panel (check-ins/sessions/measurements/flags), inline (non-modal) measurement capture and session logging, flag raise/clear. Strings centralised in `components/coach/copy.ts` |
| Studio manager console | `app/studio/page.tsx`, `components/studio/*` | **done** — dashboard stat tiles, floor view for any date the manager picks (not just today) with end times and a per-coach day timeline (`DayTimeline.tsx`), manual booking intake through a shift-and-overlap-aware slot-chip picker (`TimeSlotPicker.tsx`, `getCoachDayAvailability`) rather than a raw time input, reschedule/reassign row actions sharing the same overlap guard as booking creation, staff roster + shift assignment + new staff account creation, member roster with a detail drawer (session history, measurements, booking/charge history — `MemberDetailDrawer.tsx`, reuses `getMemberContext` rather than duplicating it). Strings centralised in `components/studio/copy.ts` |
| Superadmin console | `app/superadmin/page.tsx`, `components/superadmin/*` | **done** — cross-site dashboard (platform totals + per-site breakdown), coach workload (shift/booked hours next 7 days, sessions completed last 7 — shared action with the studio console's future use), cash ledger (booking revenue derived + manual entries, superadmin-recorded for now), studio creation, cross-site staff roster with reassign-to-site and create-staff-at-any-site. Strings centralised in `components/superadmin/copy.ts` |

### Root product deviations (2026-08-11)

Deliberately scoped out of this pass, not silently trimmed:

- **Shift-boundedness is a picker-level guarantee, not a server-level one.**
  `TimeSlotPicker`/`getCoachDayAvailability` only ever offer a coach's
  assigned-shift times, but `assertNoOverlap` (the actual write-path guard
  in `createBooking`/`rescheduleBooking`/`reassignCoach`) does not
  independently re-check the shift — only studio hours and existing-booking
  overlap. A manager cannot hit this gap through the console; a
  hand-crafted request could. See `docs/decisions.md`.
- **Cash-ledger manual entries are superadmin-only.** `recordCashEntry` is
  `requireSuperadmin`-gated; a studio manager cannot record a walk-in
  payment or refund at their own site without going through a superadmin.
  Flagged as a likely next ask, not built ahead of it being asked for.
- **`cash_ledger` is a manual-movement log, not a payments/POS system.**
  Booking revenue still only ever derives from `bookings.aed` — there is no
  real transaction processor, consistent with the "Booking and POS are ours"
  Iron Rule (in-house when built, not built now). See `docs/adr/0011`.
- **No studio-hours override per site.** `STUDIO_HOURS` (`lib/reference.ts`)
  is one constant (8am–10pm) for every site — a second site with different
  opening hours isn't representable yet.
- **`getCoachWorkload`'s "last 7 days completed" only counts logged
  `sessions` rows**, not completed bookings without a session logged against
  them — matches the existing `sessions`/`bookings` split elsewhere in the
  schema, not a new inconsistency, but worth knowing when the two numbers
  don't visually reconcile.

## Deviations from the blueprint, by module

**Member app**
- Pre-session check-in (§4.1.7) posts a hardcoded payload (`sleep:3, pain:5, areas:['lower back','right shoulder'], note:'Slept badly...'`) from a single button in `Member.tsx` — not the "two taps on a body diagram" form the blueprint describes. The `checkins` table and API route are real; the UI to fill it dynamically isn't built.
- Readiness screening (§4.1.10, §1.5) is self-service and auto-clearing rather than "completed with a coach" and cleared by "a named person" — a deliberate, documented exception. See `docs/adr/0001-parq-self-service.md`.
- Community (§4.1.4) and milestones (§4.1.5) are not built — no `friendships`, no `milestones` table.
- Wearable connection (§4.1.9) is a label only (`members.wearable` stores a provider name); no HRV/sleep/strain data is ever fetched from Whoop or Apple Health. `recoveryScore()` in `lib/scoring.ts` gives a flat +8 bonus for having *any* provider linked, exactly as the blueprint names as a placeholder (§5.4) — this one is working as documented, not a bug.

**Coach console**
- Coach outcome metrics (§4.2.7) and capacity/utilisation (§4.2.8) were deliberately removed from the coach view during the Material UI migration and moved to Administration — the product owner did not want coaches seeing studio-wide business data. This is a narrower scope than the blueprint's Phase 3 intent (which has coaches seeing their *own* outcome metrics as a coaching tool); currently a coach sees none of it.
- Coach data (bookings, roster) is scoped to the logged-in coach client-side only (`lib/reference.ts`'s `scopeSnapshotForCoach`), not enforced server-side — see `docs/adr/0002-prototype-auth-gap.md`.
- Programme prescription (§4.2.6) offers one fixed template ("Desk Reset — Block 3"), not a template library.

**Administration**
- Not a blueprint-named module until §4.4 (marked P2/P3); it was built now, ahead of that sequencing, specifically to give business data somewhere to live once it was pulled out of the coach console.
- Covers studio overview, roster, and member CRM. Does **not** cover service/price editing, resource/site management, or credit administration with an audit trail — `lib/reference.ts`'s `SERVICES`/`ADDONS` are still static, with a comment noting "becomes admin-editable tables later."

**Measurement domain**
- The blueprint's §4.1.1 table specifies four composite scores (Flexibility, Mobility, Recovery, **Consistency**). Only three are implemented — `lib/scoring.ts` has no `consistencyScore()`, and `scoreDays` has no `consistency` column.
- Bilateral capture: §5.3 states "the schema carries a `side` field from day one." It doesn't — `measurements` in `db/schema.ts` has no `side` column. Every measurement is unilateral today.
- Per-measurement provenance (`instrument`, `protocol_version`, `measured_by` on each row) isn't in the schema — `assessments` carries `source`/`coachId`/`capturedAt`/`deviceId` at the assessment level, but individual `measurements` rows carry none of it.
- Target arcs are a single global constant per muscle group (`MUSCLES` in `lib/reference.ts`) — no age/sex adjustment, matching the blueprint's own **OPEN** note (§5.2).

**Booking & scheduling**
- Modelled on services and a single coach per booking, not the resource model (§4.1.3) the blueprint calls "the modelling error that would force a rewrite" if skipped. No `resources`/`resourceBookings` tables — compression boots, the oxygen chamber, and the sound room aren't independently bookable.

**Credits & payments**
- `members.credits` is exactly the "sessions_remaining integer that gets edited" pattern the blueprint calls out by name as "where booking systems' data integrity reliably dies" (§9.4). No credit ledger, no purchase/expiry/freeze/refund/gift entry types. Payments are entirely unbuilt (blueprint marks this **OPEN** anyway).

**Notifications**
- `POST /bookings/:id/confirm`, `/decline`, and `/sessions` all return a `notified: ['push', 'whatsapp']` field in the API response, but no push or WhatsApp integration exists anywhere in the codebase — this is simulated for the demo, not a real send. Worth knowing before anyone reads that field as evidence the feature works.

**Not modeled at all yet:** `sites`, `resourceBookings`, `creditLedger`, `consents`, `auditLog`, `friendships`, `milestones`, `organisations`, `orgMembers` — all named in the blueprint's Appendix A "Not yet built" list and still accurate.
