# Decisions log — prototype

This is `prototype/`'s copy of the pattern defined in the root `docs/decisions.md`:
a running log of implementation decisions — library choices, pattern choices,
trade-offs accepted — lighter-weight than a full `docs/adr/` writeup.

**This file is a retroactive backfill, not a from-scratch log.** `prototype/`
was fully built before this file existed, so the entries below were
reconstructed on 2026-08-11 by reading the code, its comments, `docs/adr/`,
`docs/architecture/overview.md`'s deviations section, and `git log` across
the prototype's history (including its pre-split commits, before
`docs/adr/0005-prototype-product-split.md` moved it under `prototype/`).
Every entry is dated to when the decision actually happened, oldest decisions
at the bottom, and every claim is grounded in something read directly — where
the *what* is clear from the code but the *why* isn't recorded anywhere, that
is stated honestly rather than invented. Going forward, if `prototype/` is
touched again, new entries append normally at the top, same as the root file.

If a decision also constrains the future, it has a full ADR in `docs/adr/`
too — linked from the entry here rather than duplicated.

Newest entries at the top.

---

## 2026-08-10 — Body map rebuilt on a ported MIT-licensed SVG dataset, not hand-drawn beziers

**Change:** `components/Viz.tsx`'s `BodyMap` and the new `components/bodyMapData.ts`
replaced hand-authored cubic-Bézier path strings with polygon data ported from
the MIT-licensed `react-body-highlighter` package.

**Chose:** Reuse (copy, not depend on) a third-party anatomical dataset instead
of continuing to hand-iterate bezier curves.

**Why:** Hand-typed bezier coordinates hit a real quality ceiling — no
tangent/curve-continuity feedback the way dragging handles in a vector tool
gives you, so each iteration plateaued rather than converging on
illustrator-tracing quality. Full reasoning, including the two anatomical
mapping compromises (`hip_flexors` → `abductors`, `neck` front-only) and the
license terms: `docs/adr/0004-bodymap-svg-source.md`.

**Trade-off accepted:** No side views (the source dataset doesn't have them),
and two muscle groups are spatial approximations rather than exact anatomical
matches.

---

## 2026-08-10 — Coach outcome metrics and capacity moved out of the coach console into Administration

**Change:** Coach-visible outcome metrics (sessions, avg RPE, avg pain drop)
and capacity/utilisation, previously part of `components/Coach.tsx`, were
pulled out during the Material UI migration and now live only in
`components/Admin.tsx`.

**Chose:** A coach sees none of the studio-wide business data; it is
admin-only.

**Why:** Product owner did not want coaches seeing studio-wide business
numbers. This is narrower than the blueprint's Phase 3 intent (coaches seeing
their *own* outcome metrics as a coaching tool) — see
`docs/architecture/overview.md`'s "Deviations from the blueprint, by module"
→ Coach console.

**Trade-off accepted:** A coach can't currently see even their own outcome
trend as a coaching tool, which the blueprint calls for; that's a narrower
scope than intended, not a wash.

---

## 2026-08-10 — Administration built ahead of blueprint sequencing

**Change:** `components/Admin.tsx` — studio overview, roster, member CRM,
earnings — was built now, even though the blueprint doesn't name an
Administration module until §4.4, marked P2/P3.

**Chose:** Build it now rather than wait for its phase.

**Why:** Once coach outcome metrics and capacity were pulled out of the coach
console (see above), that business data needed somewhere to live. See
`docs/architecture/overview.md`'s deviations section → Administration.

**Trade-off accepted:** Doesn't cover service/price editing, resource/site
management, or credit administration with an audit trail —
`lib/reference.ts`'s `SERVICES`/`ADDONS` stay static for now (comment: "becomes
admin-editable tables later").

---

## 2026-08-10 — `globals.css`'s universal box-sizing reset scoped off form inputs

**Change:** The `box-sizing: border-box` universal reset in `app/globals.css`
was scoped to exclude `input`/`textarea`/`select`.

**Why:** It was silently overriding MUI's own content-box outlined-input CSS
(an unlayered app stylesheet rule beats a layered MUI rule regardless of
specificity), collapsing every `TextField` to about 33px tall — every text
field in the app rendered with an off-center label. Found and fixed in commit
`2aa0b38` ("Fix five member/coach UI defects…").

**Trade-off accepted:** None recorded — straightforward bug fix once the cause
(CSS layer ordering, not specificity) was identified.

---

## 2026-08-10 — Pre-session check-in rebuilt as a real form

**Change:** `components/CheckinForm.tsx` replaced a single button in
`Member.tsx` that posted a hardcoded payload
(`sleep:3, pain:5, areas:['lower back','right shoulder']`) on every click.

**Why:** The hardcoded payload was a placeholder that had never been replaced
with the sliders/multi-select the blueprint describes. Fixed in the same pass
as the box-sizing bug (commit `2aa0b38`). `docs/architecture/overview.md`
still lists this gap as a historical deviation for context — it is now closed
in the prototype.

**Trade-off accepted:** None — this closes a previously-flagged deviation
rather than opening one.

---

## 2026-08-10 — `members.addedByCoachId` added so a freshly-created member doesn't vanish from the coach's own roster

**Change:** New column `addedByCoachId` on `members` (`db/schema.ts`), read by
`lib/reference.ts`'s `scopeSnapshotForCoach`.

**Why:** `scopeSnapshotForCoach` scopes a coach's view to members tied to them
by booking/session/assessment/programme. A member a coach just created via
"Add a member" has none of those yet, so they disappeared from that coach's
roster the instant they were created. Bug found and fixed in commit `2aa0b38`.

**Trade-off accepted:** This scoping (like all of `scopeSnapshotForCoach`) is
client-side only, not real authorization — see the entry below on the
identity-cookie session model and `docs/adr/0002-prototype-auth-gap.md`.

---

## 2026-08-10 — Prototype split into `prototype/`, real product starts at repo root

**Change:** Everything that existed (the whole prototype app) moved under
`prototype/` as a self-contained Next.js app with its own
`package.json`/`node_modules`/`.env`. The repo root became a bare Next.js + MUI
shell for the real product.

**Why:** The team was ready to start the real customer-facing build, and
wanted the prototype kept around, runnable, and referenceable, without either
tree contaminating the other. Full reasoning and consequences:
`docs/adr/0005-prototype-product-split.md`.

**Trade-off accepted:** Two `node_modules`, two lockfiles, two `.env` files
that will drift over time — accepted as expected, not a bug, per the ADR.

---

## 2026-08-10 — `prototype/next.config.mjs` sets `agentRules: false`

**Change:** `outputFileTracingRoot` and `agentRules: false` added to
`prototype/next.config.mjs`.

**Why:** Next.js 16 auto-writes a generic `CLAUDE.md`/`AGENTS.md` per Next
project root on `next dev`/`next build`. Left on, it would create a second,
competing pair of agent-instruction files inside `prototype/` that shadow the
real root-governed ones for any agent working with `prototype/` as its cwd.
Covered as a consequence of the split: `docs/adr/0005-prototype-product-split.md`.

**Trade-off accepted:** None recorded.

---

## 2026-08-10 — Material UI adopted as the strict design system (commit `6c55e36`)

**Change:** The prototype's original hand-rolled CSS (`app/globals.css` had
207 lines pre-migration) was replaced with `@mui/material`,
`@mui/icons-material`, `@mui/material-nextjs`, `@mui/x-charts`,
`@emotion/react`/`styled` as the styling layer, driven by a new
`theme/theme.ts`. This is the same commit that introduced real Next.js routes
(`/member`, `/coach`, `/admin`), the identity-cookie session, and the ADRs.

**Chose:** MUI's component library + `sx`-prop-only styling over the prior
approach of hand-authored CSS/inline styles.

**Why:** `prototype/material UI.md` is the explicit instruction file that
directed this migration — a design-system brief telling the agent to use MUI
components exclusively, spacing on an 8px baseline, and the `sx` prop instead
of raw CSS or inline styles. Its placeholder color tokens (`#2196f3` blue
primary, `#9c27b0` purple secondary — stock MUI demo colors) were **not**
kept: `theme/theme.ts`'s own header comment records that the palette was
reconciled against the prototype's actual bone/ink/lime tokens from the
pre-MUI `app/globals.css` `:root` block instead, because the guessed values in
the design-system brief didn't match what had actually been built.

**Trade-off accepted:** `theme/theme.ts` notes the prototype's inverted
dark-ink-card-on-bone-page pattern (`InkPanel` in `Member.tsx`, drawer panels
in `Coach.tsx`/`Admin.tsx`) isn't yet expressed as a proper MUI `Paper`
variant — `background.paper` stays MUI-default white, and ink panels are
built with manual `sx` overrides instead. Flagged as a follow-up, not done in
this pass.

---

## 2026-08-10 — Viewport `colorScheme` locked to `'light'`

**Change:** `app/layout.tsx`'s `viewport` export sets `colorScheme: 'light'`.

**Why:** The app is light-only (no dark palette built — `theme.ts`'s
`palette.mode` is fixed `'light'`). Without this, phones with system dark mode
on apply the browser's forced/auto-dark heuristic to the page, shifting the
hardcoded status colours (restricted/limited/optimal/excellent on the body
map) away from their real hex values. Comment in `app/layout.tsx` notes this
mostly showed up on mobile, not desktop.

**Trade-off accepted:** None — straightforward, low-cost fix once the cause
was identified.

---

## 2026-08-09/10 — Identity-cookie "session" instead of real auth

**Change:** `lib/session.ts` + `app/api/session/route.ts` — an httpOnly cookie
(`marn_who`) set by the no-password persona picker (`components/Gate.tsx`),
read server-side via `getIdentity()` in each route's `page.tsx`.

**Why:** Real routes (`/`, `/member`, `/coach`, `/admin`) replacing a
single-page client-state app needed *some* way for a server component to know
"who" is asking before rendering. Full reasoning and the exact authorization
gap this leaves open: `docs/adr/0002-prototype-auth-gap.md`.

**Trade-off accepted:** Explicitly not authorization — anyone can `POST
/api/session` with any `{kind, id}` and become that identity.
`GET /api/snapshot` still returns the whole unscoped database to anyone who
calls it directly; UI-layer scoping (`lib/reference.ts`'s
`scopeSnapshotForCoach`/`scopeSnapshotForMember`) is a payload-size
optimization, not a security boundary.

---

## 2026-08-09 — PAR-Q made self-service, auto-clearing

**Change:** `components/ParqForm.tsx` + `POST /members/:id/parq/submit` in
`app/api/[...path]/route.ts` — a member completes the readiness screening
themselves, and the system auto-clears them unless a red-flag answer is
given, in which case it hard-blocks with a referral message.

**Chose:** Self-service clearing, as a deliberate, confirmed exception to
`CLAUDE.md`'s Iron Rule that a PAR-Q flag "gates... until a named person
clears it... no clearing on the member's own say-so."

**Why:** Without this, new members were permanently blocked from booking —
the only path to clearance was a coach manually flipping a flag, with no
interactive questionnaire on either side. Confirmed explicitly with the
product owner after the conflict with the Iron Rule was surfaced. Full
reasoning and the scope of the exception: `docs/adr/0001-parq-self-service.md`.

**Trade-off accepted:** A member who answers "no" to everything clears
themselves with no coach ever reviewing it. The exception is scoped narrowly
to PAR-Q *clearing* — coach-raised safety flags still require a coach to
clear them.

---

## 2026-08-09 — BodyMap kept behind an anti-corruption adapter; only manual entry implemented

**Change:** `lib/adapters/bodymap.ts` defines one canonical shape
(`NormalisedMeasurement[]`) and three adapters: `fromDeviceApi` (stub, throws),
`fromExportFile` (stub, throws), `fromManualEntry` (implemented). A fourth
function, `simulateDeviceRead`, is explicitly marked demo-only.

**Why:** The BodyMap device's real integration surface (API, export format,
device ID scheme) isn't known yet, and the measurement dataset is the actual
product — so the boundary protecting domain code from an unknown/changing
vendor format is high-leverage to get right early, before any real vendor
contract exists. Full reasoning: `docs/adr/0003-initial-decisions.md` §3.

**Trade-off accepted:** `simulateDeviceRead` (`lib/adapters/bodymap.ts`) exists
purely so the prototype can demo an ingestion landing without a real device —
its own doc comment says "Delete this the day a real adapter works." Nothing
outside this one file references a BodyMap-shaped type, confirmed by reading
every call site.

---

## 2026-08-09 — Plain Postgres connection string, no vendor-specific extensions

**Change:** `db/index.ts` connects via a single `DATABASE_URL` and
`drizzle-orm/neon-http`; `db/schema.ts`'s header comment states "nothing here
is Neon-specific... moving to RDS in me-central-1 is a change of
`DATABASE_URL`."

**Why:** UAE Federal Law No. 2 of 2019 restricts UAE-generated health data
(joint angles, pain scores) from being stored outside the UAE, and neither
Neon nor Vercel has a UAE region — so the prototype was explicitly scoped to
hold no real member data, with the database layer built so a later move to a
UAE-resident region is cheap. Full reasoning: `docs/adr/0003-initial-decisions.md`
§2. Independently confirmed in `prototype/README.md`'s "Do not put real member
data in this" section, which states the same rationale for a non-technical
reader.

**Trade-off accepted:** Several conveniences are permanently off the table,
not just for the prototype — no Supabase Auth, no PostgREST, no
database-level row security as an authorization mechanism, per the ADR.

---

## 2026-08-09 — Neon + Vercel chosen for prototype hosting, not production

**Change:** The prototype runs on Vercel (hosting) + Neon (managed Postgres).

**Why:** Fastest path to a shareable demo link; Neon's free tier doesn't pause
into unavailability after a week idle (matters for an investor opening the
link on a quiet Tuesday). Explicitly scoped to hold no real member data — see
the entry above and `docs/adr/0003-initial-decisions.md` §1.
`prototype/README.md` adds the practical detail: use the **pooled** connection
string, not the unpooled one, which exhausts connections the moment more than
one person clicks around.

**Trade-off accepted:** Production cannot launch on this stack as-is — a move
to a UAE-resident region (AWS `me-central-1`, Azure UAE North, or a local
provider) is required before the first real member record, and is still
**OPEN** per the blueprint.

---

## 2026-08-09 — Drizzle ORM chosen over alternatives (Prisma, raw SQL, etc.)

**Reasoning not recorded in commit history.** `drizzle-orm` +
`@neondatabase/serverless` are present in the very first commit
(`d9573c1`, "Initial commit for Marn prototype") with no earlier state to diff
against, and no ADR or comment directly compares Drizzle to an alternative.
What *is* recorded: `docs/adr/0003-initial-decisions.md` §2 explains the
adjacent decision — plain connection string, no vendor extensions, no
database-level authorization — which Drizzle satisfies structurally (it's a
thin SQL-shaped query builder with no proprietary runtime or hosted service
attached, unlike e.g. Supabase's client libraries), but that ADR doesn't
name Drizzle specifically or compare it to Prisma. Treat "why Drizzle" as
inferred-compatible with the portability decision, not independently
justified anywhere in the repo.

---

## 2026-08-09 — Single dispatcher file for the entire API surface

**Change:** `app/api/[...path]/route.ts` is one large file handling every
resource (members, bookings, assessments, sessions, programs, checkins,
admin) via string-matching on the path segments, rather than per-resource
Next.js route modules.

**Why:** Recorded directly in the file's own header comment: kept in one file
"on purpose while the contract is still moving — the entire surface is
readable top to bottom, which is what you want when a coding agent or a new
engineer is extending it." The comment also states the intended exit
condition: "Split into per-resource route modules once the shape settles; the
paths do not change when you do."

**Trade-off accepted:** A 360+ line file mixing routing, business logic, and
persistence for every resource in the product — deliberate, with a named
condition for when to stop accepting it.

---

## 2026-08-09 — `GET /snapshot?scope=` added as a payload-size optimization, not authorization

**Change:** `app/api/[...path]/route.ts`'s `snapshot()` function accepts an
optional `scope: {kind, id}` and applies `scopeSnapshotForCoach` /
`scopeSnapshotForMember` (`lib/reference.ts`) server-side before the response
goes over the wire.

**Why:** Comment in `route.ts` above `snapshot()`: Member and Coach both used
to fetch the entire database on every 5-second poll and filter client-side.
This reuses the same filter functions Coach.tsx already applied client-side,
just earlier in the pipeline, purely to cut payload size.

**Trade-off accepted:** Explicitly still not real authorization — the comment
states plainly "the caller declares its own scope, nothing checks they're
entitled to it," linking the same gap as `docs/adr/0002-prototype-auth-gap.md`.
Admin and the Gate persona picker still request the full unscoped snapshot.

---

## 2026-08-09 — Module-scope components / lifted form state to survive the snapshot poll ("Known trap")

**Change:** Every interactive sub-view in `Gate.tsx`, `Member.tsx`,
`Coach.tsx`, `Admin.tsx`, `ParqForm.tsx`, and `CheckinForm.tsx` is either a
plain function called inline (never mounted as `<Component />`) or defined at
module scope — never as a component defined inside another component's body.
Form state for drawers/dialogs is lifted to the parent that survives the poll.

**Why:** A sub-view component defined inside a parent's render body gets a new
identity on every render. The app polls `GET /snapshot` every 5-12 seconds
(`lib/store.ts`'s `useSnapshot`), which re-renders the tree; if a view held
its own state or was defined inline, that poll would remount it and wipe
in-progress input (typed member signup fields, half-answered PAR-Q, a coach's
half-typed session notes). This bug and fix are called out by name in
multiple places: `Gate.tsx`'s and `Coach.tsx`'s header comments ("the fix for
the original focus-loss bug"), and it's promoted to a standing rule in the
root `CLAUDE.md`'s "Known trap" note — the prototype is where that rule was
learned.

**Trade-off accepted:** None — this is a correctness fix with no real
downside, just a structural discipline every new sub-view has to follow.

---

## 2026-08-09 — `measurements` is its own table, not a JSON blob on `assessments`

**Change:** `db/schema.ts` — `measurements` is a first-class table with one
row per muscle group per assessment, rather than a `jsonb` column on
`assessments`.

**Why:** Recorded in `db/schema.ts`'s header comment: "Every ROM number is a
first-class row so you can query 'show me left hamstring across all members
over 6 months' without unpacking JSON. This table is the actual asset of the
business."

**Trade-off accepted:** None recorded — straightforward normalization
decision with no noted downside.

---

## 2026-08-09 — `scoreDays` denormalized as its own table

**Change:** `db/schema.ts` — `scoreDays` stores one row per member per day
with `flexibility`/`mobility`/`recovery` already computed, rather than being
derived on read from `measurements`/`sessions`/`programs` each time.

**Why:** Recorded in `db/schema.ts`'s header comment: the progress chart
(`Member.tsx`'s Progress tab) is the most-read screen in the product and
"should never join five tables." `refreshScoreDay()`
(`app/api/[...path]/route.ts:112`) recomputes and overwrites today's row after
anything that could move it — wearable link, assessment (manual or BodyMap),
session log, or programme completion.

**Trade-off accepted:** A derived value stored redundantly, kept correct only
because every mutation path remembers to call `refreshScoreDay()` — there's no
database constraint enforcing that.
