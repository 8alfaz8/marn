# CLAUDE.md — Marn engineering law

Marn is a **measurement company delivered through studios**. One-to-one assisted stretching and multi-modality recovery (compression, oxygen, sound, hydration) are the delivery; the product is the measured change in a member's body over time, and the proof we can show them, their coach, and their employer. Every engineering decision serves that: if a feature doesn't produce, protect, or reveal a measurement, it is not the priority.

Small team, compressed timeline. Leverage comes from these standards, not headcount.

> **Before first commit:** reconcile the Repo map paths, the commands, and the palette hex values in `docs/design/design-system.md` with what is actually in the repo. Anything marked `«…»` is a placeholder.

## Source of truth, in order

1. **The blueprint** — `docs/blueprint/` — the product spec (business thesis, four surfaces, measurement system, BodyMap boundary, architecture, UAE regulatory posture, roadmap, data dictionary, API reference). It is amendable, but only in the same PR as the code that diverges from it, with a one-line note in `docs/adr/`. Silent divergence from the blueprint is a defect.
2. `docs/architecture/overview.md` — module → code map and **phase status**. Building a module ahead of its phase is a defect; say so and build what's mapped.
3. `docs/design/design-system.md` (Material UI + Marn tokens) and `docs/design/journeys.md` (member and coach journeys) — law for anything the member, coach, or corporate admin sees.
4. This file — the summary that binds them.

## How you write code

The four principles in `.claude/skills/karpathy-guidelines/SKILL.md` are binding on every change:

- **Think before coding** — state assumptions; if two readings of the request exist, name both instead of picking one silently; push back when a simpler approach exists.
- **Simplicity first** — the minimum code that solves the problem. No speculative abstraction, no configurability nobody asked for, no error handling for impossible states. 200 lines that could be 50 get rewritten.
- **Surgical changes** — every changed line traces to the request. Don't reformat, rename, or "improve" adjacent code. Clean up only orphans your own change created; mention pre-existing dead code, don't delete it.
- **Goal-driven execution** — turn each task into a verifiable goal ("write a test that reproduces the bug, then make it pass") and loop until it's met.

These bias toward caution over speed. For a typo or an obvious one-liner, use judgement.

**Scope discipline (where the two pull against each other):** ship the *whole* mapped user-facing capability — a half-walkable journey is not a feature — but implement it with the smallest code that does the job. Full scope, minimal implementation. Anything genuinely deferred gets a dated line in `docs/architecture/overview.md`, never a silent trim.

## Iron rules (violating any is a blocking defect)

- **Measurement provenance is mandatory.** Every measured value carries `source` (`bodymap` | `coach_manual` | `member_report`), `instrument`, `protocol_version`, `measured_at`, `measured_by`. A derived, estimated, or interpolated value never lands in the same column as a measured one. Charts must be able to say where each point came from.
- **Wellness studio, not a clinic.** No diagnosis, no treatment claims, no clinical vocabulary in UI copy, notifications, reports, or generated text. We describe range, symmetry, and change over time — never pathology. Copy that reads as medical advice is a defect regardless of how accurate it is.
- **Health data is the highest-sensitivity class.** PAR-Q answers, injuries, flags, measurements, and member identifiers never appear in logs, traces, analytics events, error reports, or third-party payloads. Data residency and retention follow the regulatory chapter of the blueprint; when a new vendor touches member data, that's an ADR, not a config change.
- **Safety flags route to a human.** A PAR-Q flag or coach-raised concern gates the affected activity until a named person clears it, with who and when recorded. No automatic expiry, no clearing on the member's own say-so.
- **BodyMap stays behind the adapter.** One port, three adapters — device API, file export, manual entry. No BodyMap-shaped type, field name, or unit assumption escapes `«lib/integrations/bodymap»` into domain code. Domain code must compile and pass tests with the manual-entry adapter alone.
- **Plain Postgres, portable.** Drizzle migrations checked in, connection string only, no vendor-specific extensions or platform-locked features. We must be able to move the database in a weekend.
- **Authorization is server-side, always.** Every read and write is authorized in a server action or route handler against the session's role (member / coach / studio manager / corporate admin / platform admin). A member id supplied by the client is an input to validate, never a fact. A corporate admin sees aggregates, never an individual member's measurements, unless the member consented and that consent is recorded.
- **Booking and POS are ours.** They are core surface area, built in-house. Don't introduce a third-party booking or payment-scheduling dependency without an ADR.
- **English now, Arabic RTL later — architected today.** No hardcoded user-facing strings in components; no physical-direction CSS (use logical properties). Arabic must be a configuration flip, not a rewrite.
- **Decide, then build; ask only at genuine forks.** Written in the blueprint/ADRs → follow it. Derivable from written principles and existing precedent in the repo → decide it, note the reasoning in the PR. Genuine fork (a member-visible identity, money, data-shape, or compliance choice with no written basis and real cost to reverse) → ask, as options plus a recommendation, through the structured question tool, and keep building unblocked work while waiting. "What should I build next?" is not a question — the phase in `docs/architecture/overview.md` answers it. A session ends with "done: X; next up: Y".

## Repo map

Reconciled against what's actually in the repo (2026-08-09). Route groups in
the original plan (`app/(member)`, `app/(coach)`) don't work as written — a
parenthesized segment adds no URL, so two of them both resolving to `page.tsx`
collide at `/`. Plain directories give each surface its own URL instead.

| Path | What |
|---|---|
| `app/page.tsx` | Gate — persona picker + signup (`components/Gate.tsx`) |
| `app/member` | Member surface at `/member` — booking, progress, session history, PAR-Q |
| `app/coach` | Coach console at `/coach` — day view, session capture, measurements, flags |
| `app/admin` | Admin/CRM at `/admin` — studio outcomes, revenue, capacity, roster, member roster |
| `app/(corporate)` | **Not built.** Corporate portal is blueprint Phase 4 — no employer accounts exist yet |
| `app/api` | Single dispatcher route (`app/api/[...path]/route.ts`) + `app/api/session` for the identity cookie |
| `lib/reference.ts` | Static reference data, scoring inputs, `scopeSnapshotForCoach`, `PARQ_QUESTIONS` |
| `lib/session.ts` | Identity cookie helpers — **not real authorization**, see `docs/adr/0002` |
| `lib/db` | **Not built as its own directory** — schema lives in `db/schema.ts`, queries inline in the API dispatcher |
| `lib/measurement` | **Not built.** Provenance fields (`instrument`, `protocol_version`, `measured_by`) aren't in the schema yet — see `docs/adr/0002` |
| `lib/integrations/bodymap` | **Not built under this path** — the adapter lives at `lib/adapters/bodymap.ts` |
| `lib/auth` | **Not built.** No real session/role system — see `docs/adr/0002` |
| `components/` | Chrome (shared AppBar), Gate, Member, Coach, Admin, ParqForm, Viz (brand SVG), Panels (debug tools, plain CSS by design) |
| `theme/` | MUI theme + Marn tokens (`theme.ts` is visual truth) — palette reconciled against the prototype's actual brand hex values |
| `drizzle/` | **Not present** — migrations run via `drizzle-kit push` (`db:push`), not checked-in migration files |
| `docs/` | `docs/design/design-system.md`, `docs/adr/`. `docs/blueprint/`, `docs/architecture/overview.md`, `docs/design/journeys.md` don't exist yet — `marn-blueprint.md` at the repo root is the single-file source of truth for now |

## Commands

`npm run dev` · `npm run build` · `npm run db:push` / `npm run db:studio` / `npm run db:seed` (Drizzle). **No `npm run check` script exists** — there is no lint/test config in this repo yet; `npx tsc --noEmit` and `npm run build` are the only automated checks available today.

## Workflow

Plan first for anything non-trivial — a numbered plan with a verification step per line, in the response, before the first edit. Tests where they pay (measurement math, provenance, authorization, adapters — not every render). Small diffs. Conventional commits. An ADR in `docs/adr/` when a decision constrains the future (vendor, schema shape, boundary, pricing model). Update the module's section in `docs/architecture/overview.md` in the same change.

When a task is done, pull the next unchecked item in the current phase and start it.

## Definition of Done

The mapped capability, end to end + tests at the layers that matter + `«npm run check»` green + the journey step is **walkable by a first-time user**: they reach it, complete it, and are shown their obvious next step. Empty, first-run, loading, and error states are part of the feature, not a follow-up. Measurement writes carry provenance. Nothing sensitive in logs. Docs/ADR updated. No new TODO without an issue.

## UI work

**Build from the journey, not the screen.** Two journeys are binding (`docs/design/journeys.md`):

- **Member:** first visit → PAR-Q → baseline assessment → *first visible proof it worked* → book again → progress over weeks.
- **Coach:** day view → member context before they walk in → capture during session → notes and flags → hand off.

For each step, answer in the user's shoes: what did I just do, what do I see now, what is the obvious next thing? A backend with no surface, or a screen that leaves someone with no next action, is the defect.

**The progress curve is the hero.** The single most important pixel in this product is a member seeing their own measured change. Design every other surface to lead there.

**The design system is Material UI, strictly** (`docs/design/design-system.md`): components from `@mui/material`, styling only through the theme and the `sx` prop. A hardcoded colour, font, or pixel spacing, or a re-implemented MUI component, is a blocking defect. Before building a surface, name the closest precedent you're designing *to* — a real, well-solved reference for that density and interaction pattern — rather than a bare wireframe.

**Coach console density is a hard requirement.** A coach is standing, one-handed, mid-session, on a tablet. Time-to-capture beats aesthetics: a measurement goes in with minimum taps and never blocks on a modal.

**Known trap — do not repeat it:** sub-view components defined inline inside a parent get a new identity on every render, remount, and lose form state. Any polling or revalidation then wipes a coach's in-progress notes. Define components at module scope; lift form state to the parent that survives the refresh. Never let a background refresh clobber unsaved input.

## Never

Secrets or `.env` in git · member health data or identifiers in logs, traces, or analytics · raw SQL scattered through route handlers instead of the query layer · clinical or diagnostic claims in copy · BodyMap types leaking past the adapter · client-trusted authorization · individual member data exposed in the corporate portal · schema changes without a checked-in migration · red merges · force-push main · drive-by refactoring outside the task · silently narrowing scope · asking what to build next.

## When unsure

Which module owns this? → `docs/architecture/overview.md`. Why is it like this? → `docs/adr/`, then the blueprint. Is this allowed yet? → phase status in the overview. Still unsure → propose an ADR rather than improvising.
