# CLAUDE.md — Marn engineering law

Marn is a **companion app for physical rehab and pain relief**, delivered through one-to-one assisted stretching and multi-modality recovery (compression, oxygen, sound, hydration) in studios. The app is where a member lives day to day; the studio is where the physical work happens. Every session is measured, so the relief is provable — to the member, their coach, and their employer — not just felt. Every engineering decision serves the pain-relief outcome first; measurement exists to prove and sustain it, never to replace it as the point of the product.

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
- **Wellness studio, not a clinic.** No diagnosis, no treatment claims, no clinical vocabulary in UI copy, notifications, reports, or generated text. We describe range, symmetry, and change over time — never pathology. Copy that reads as medical advice is a defect regardless of how accurate it is. This is not in tension with selling on pain relief: pain relief is the marketed outcome, described as measured change ("reported pain down from 6 to 3"), never as a diagnosis, treatment plan, or cure.
- **Health data is the highest-sensitivity class.** PAR-Q answers, injuries, flags, measurements, and member identifiers never appear in logs, traces, analytics events, error reports, or third-party payloads. Data residency and retention follow the regulatory chapter of the blueprint; when a new vendor touches member data, that's an ADR, not a config change.
- **Safety flags route to a human.** A PAR-Q flag or coach-raised concern gates the affected activity until a named person clears it, with who and when recorded. No automatic expiry, no clearing on the member's own say-so.
- **BodyMap stays behind the adapter.** One port, three adapters — device API, file export, manual entry. No BodyMap-shaped type, field name, or unit assumption escapes `«lib/integrations/bodymap»` into domain code. Domain code must compile and pass tests with the manual-entry adapter alone.
- **Plain Postgres, portable.** Drizzle migrations checked in, connection string only, no vendor-specific extensions or platform-locked features. We must be able to move the database in a weekend.
- **Authorization is server-side, always.** Every read and write is authorized in a server action or route handler against the session's role (member / coach / studio manager / corporate admin / platform admin). A member id supplied by the client is an input to validate, never a fact. A corporate admin sees aggregates, never an individual member's measurements, unless the member consented and that consent is recorded.
- **Booking and POS are ours.** They are core surface area, built in-house. Don't introduce a third-party booking or payment-scheduling dependency without an ADR.
- **English now, Arabic RTL later — architected today.** No hardcoded user-facing strings in components; no physical-direction CSS (use logical properties). Arabic must be a configuration flip, not a rewrite.
- **Decide, then build; ask only at genuine forks.** Written in the blueprint/ADRs → follow it. Derivable from written principles and existing precedent in the repo → decide it, note the reasoning in the PR. Genuine fork (a member-visible identity, money, data-shape, or compliance choice with no written basis and real cost to reverse) → ask, as options plus a recommendation, through the structured question tool, and keep building unblocked work while waiting. "What should I build next?" is not a question — the phase in `docs/architecture/overview.md` answers it. A session ends with "done: X; next up: Y".

## Repo map

Reconciled against what's actually in the repo (2026-08-10). Two trees now
(see `docs/adr/0005-prototype-product-split.md`):

- **`prototype/`** — the disposable, no-real-auth build. Self-contained Next.js
  app (own `package.json`, `node_modules`, `.env`) kept running as a reference
  and demo, not extended with real-product work.
- **Repo root** — the real customer product, starting from a bare Next.js +
  MUI shell (no feature code yet). This is what every new feature request
  builds into.
- **`docs/`, `CLAUDE.md`, `AGENTS.md`** stay at root and govern both trees.

Route groups in the original plan (`app/(member)`, `app/(coach)`) don't work
as written — a parenthesized segment adds no URL, so two of them both
resolving to `page.tsx` collide at `/`. Plain directories give each surface
its own URL instead — true in `prototype/` and binding for the root build too.

| Path | What |
|---|---|
| `app/layout.tsx`, `app/page.tsx` | Root product shell — bare MUI `ThemeProvider`/`CssBaseline`, no feature pages yet |
| `theme/theme.ts` | Root product theme — currently plain MUI defaults, `direction: 'ltr'`, RTL-ready. Pending the new brand design system (logo, fonts, palette) before this becomes visual truth |
| `prototype/app/page.tsx` | Prototype gate — persona picker + signup (`prototype/components/Gate.tsx`) |
| `prototype/app/member`, `/coach`, `/admin` | Prototype member/coach/admin surfaces — see `docs/architecture/overview.md` for what each does and its deviations from the blueprint |
| `prototype/app/api` | Prototype's single dispatcher route + identity-cookie session endpoint |
| `prototype/lib/session.ts` | Identity cookie helpers — **not real authorization**, see `docs/adr/0002` |
| `prototype/lib/adapters/bodymap.ts` | BodyMap anti-corruption adapter — manual-entry path works, device/file-export paths are stubs |
| `prototype/components/`, `prototype/theme/`, `prototype/db/` | Prototype UI, MUI theme + tokens, Drizzle schema/seed — unchanged from before the split, just relocated |
| `lib/auth`, `lib/measurement`, `lib/integrations/bodymap`, `db/` (root) | **Not built yet at root.** Real auth, per-measurement provenance, and a BodyMap adapter are Phase-mapped work for the root product, not assumed reusable from the prototype's shortcuts — see `docs/adr/0002` and `docs/adr/0005` |
| `docs/` | `docs/blueprint/marn-blueprint.md`, `docs/architecture/overview.md`, `docs/design/design-system.md`, `docs/design/journeys.md`, `docs/adr/` — all present, all governing the root build. Plus two living logs kept current alongside every change: `docs/decisions.md` (why — decision + reasoning + trade-off) and `docs/flow.md` (how — call chains between files/functions/modules) |

## Commands

Root product: `npm run dev` / `npm run build` from the repo root, once dependencies are installed there.

Prototype: same commands from inside `prototype/` — plus `npm run db:push` / `npm run db:studio` / `npm run db:seed` (Drizzle, prototype only).

**No `npm run check` script exists in either tree** — there is no lint/test config yet; `npx tsc --noEmit` and `npm run build` are the only automated checks available today.

## Workflow

Plan first for anything non-trivial — a numbered plan with a verification step per line, in the response, before the first edit. Tests where they pay (measurement math, provenance, authorization, adapters — not every render). Small diffs. Conventional commits. An ADR in `docs/adr/` when a decision constrains the future (vendor, schema shape, boundary, pricing model). Update the module's section in `docs/architecture/overview.md` in the same change.

Also in the same change:
- **`docs/decisions.md`** — append an entry for every meaningful decision made while writing the code: library chosen over an alternative, pattern chosen over an alternative, a trade-off accepted. One entry per decision, newest at the top. If the decision also constrains the future, it gets a full ADR too — link it from the entry instead of duplicating the writeup.
- **`docs/flow.md`** — add or update the entry for the execution path touched: what calls what, across which files/functions/modules, in what order, and which part of that path the current change modifies. Update the existing entry in place if the change touches a path already traced; don't duplicate it.

When a task is done, pull the next unchecked item in the current phase and start it.

## Confirm before major changes

Before starting a major change — a new dependency, a schema/migration, a new architectural pattern, anything touching auth/security or the measurement/provenance model, or a change spanning multiple modules — stop and quiz the user on it through the structured question tool: what you're about to do, the alternatives considered, and a recommendation. Proceed only once they accept. This is stricter than "ask only at genuine forks" above, deliberately, for this category of change specifically — it does not apply to small changes (a typo, a one-line fix, a single-file bug fix), which still follow "decide, then build."

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
