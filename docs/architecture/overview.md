# Architecture overview

Module → code map and phase status. Status reflects what's actually in the
repo today, not the blueprint's roadmap — see `docs/blueprint/marn-blueprint.md`
for the aspirational shape. Keep this current: when a module's status changes,
update its row in the same change.

**Status key:** not started · in progress · done (done = the blueprint's P1
scope for that module is implemented; it does not mean "matches the full
blueprint spec").

| Module | What it does | Code path | Status |
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
| Design system | MUI v9 theme, tokens | `theme/theme.ts`, `docs/design/design-system.md` | **done** — every surface in the app renders through it |
| Hosting / data residency | UAE-region production hosting | — | **not started** — prototype runs on Vercel + Neon, which the blueprint explicitly allows only because it holds no real member data (§8.2) |

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
