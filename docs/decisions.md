# Decisions log

Running log of implementation decisions made while changing code — library
choices, pattern choices, trade-offs accepted. Lighter-weight than
`docs/adr/`: no numbering, no Context/Decision/Consequences structure, one
entry per decision, appended in the same change that makes it.

If a decision also constrains the future (vendor, schema shape, boundary,
pricing model — per `CLAUDE.md`'s Iron Rules), it still gets a full ADR in
`docs/adr/` too. Link it from the entry here instead of duplicating the
writeup.

Newest entries at the top.

---

## 2026-08-11 — Coach and studio manager console UIs (made autonomously — flagging for review)

Built by two parallel background passes consuming the already-reviewed
data layer, then spot-checked and independently rebuilt/verified
(`tsc`, `next build`) rather than trusted at face value. Both landed
clean. The real judgment calls, for review:

**Coach console (`components/coach/*`)**
1. **Contact/payment fields are stripped field-by-field at the page**, not
   trusted to already be absent — `app/coach/page.tsx` maps each booking
   and member row to an explicit narrow shape before it reaches the
   client, even though the underlying actions already scope by role.
   Belt-and-braces on top of `docs/adr/0008`'s server-side enforcement.
2. **No flag indicator on the schedule/roster rows** — only
   `getMemberContext(memberId)` returns flags, and fanning out a context
   call per row just to show a marker wasn't worth it. Shows
   "Awaiting readiness screening" instead (data that *is* available at
   list level). Closing this properly needs a flagged-member-id list
   added to an existing read action — a small follow-up, not done here
   to avoid touching the data layer mid-UI-build.
3. **Refresh is stale-while-revalidate**: saving never unmounts the
   capture forms, a 4px `LinearProgress` shows in reserved space instead.
   Protects in-progress typing from `router.refresh()` — the same
   "known trap" `CLAUDE.md` already documents, applied to a save-refresh
   cycle instead of a poll.
4. **Modality list is a small hand-picked constant**, not sourced from a
   table (no `modalities` reference table exists). Revisit when
   Administration makes services/modalities editable.

**Studio manager console (`components/studio/*`)**
1. **Didn't call `getManagerScheduleToday()`** — `getManagerDashboard()`
   already returns today's bookings alongside the counts, so a second
   identical query would only add a round-trip. That result comes back
   unordered (unlike the dedicated action, which orders by time), so the
   floor panel sorts client-side for display.
2. **Price and duration are always derived from `lib/reference.ts`'s
   `SERVICES`**, never a free-text field — the manual booking path can't
   drift from the price list by typo.
3. **No PAR-Q/readiness column on the member roster**, even though the
   data is available — readiness is health-adjacent and stays the coach
   console's territory; this surface shows roster/contact/booking facts
   only.
4. **`success` colour, initially used for a "completed" booking status
   chip, was corrected to neutral** after review — `theme/theme.ts`
   documents `success` as reserved for *measured positive change*, and a
   routine completed-booking state isn't a proof point. Fixed in
   `components/studio/primitives.tsx` rather than left as filed feedback.

**Cross-cutting, fixed after both landed**
- **User-facing strings weren't centralised anywhere at root** before
  this pass — `components/StaffChrome.tsx` and `app/login/page.tsx`
  (both written earlier this session) used inline literals, which is a
  `CLAUDE.md` Iron Rule violation ("no hardcoded user-facing strings in
  components... Arabic must be a configuration flip"). The coach console
  agent caught this and built its own `components/coach/copy.ts`
  correctly; the studio console agent caught the same issue but matched
  the bad precedent instead of fixing it, reasonably reading "match
  existing convention" as safer than inventing a third pattern
  mid-build. Fixed the root cause instead: added `lib/copy.ts`
  (`shellCopy`) for the shared login/chrome strings and rewired both
  files to use it. **Still open:** `components/studio/*`'s ~900 lines
  of inline strings were not extracted in this pass — a mechanical but
  sizeable follow-up, tracked in `docs/architecture/overview.md` rather
  than rushed at the end of this session.

## 2026-08-11 — Data layer decisions for the coach/studio-manager slice (made autonomously — flagging for review)

The user asked me to keep building through the rest of Phase 1 without
stopping to ask, taking any logical decisions myself and logging them
here for review later. These five are the real judgment calls from that
pass — everything else was mechanical execution of `docs/adr/0007`/`0008`.

**1. Manual booking creates `confirmed` directly, not `requested` → approved.**
`lib/actions/bookings.ts`'s `createBooking` sets `status: 'confirmed'`
immediately with a coach assigned, skipping the `requested` state.
*Why:* the studio manager is both the intake point (member calls/walks in)
and the approver in this slice — there's no other party to request
*from* yet. `requested`/`declined` stay in the schema unused until
member self-service booking (Phase 2) gives them a real origin.
*Revisit if:* a request can originate from somewhere other than the
manager before Phase 2 arrives (e.g. a coach taking a walk-in).

**2. `assertMemberInScope` (`lib/authz.ts`) is the single enforcement point
for the coach/manager data split**, not a per-query filter repeated in
every action. Every per-member read or write in `lib/actions/*.ts` calls
it before touching data. *Why:* the alternative — trusting each new
action to independently re-derive "does this coach own this member" —
is exactly the kind of repeated-logic drift that produces an
authorization bug eventually. One function, one place to audit.

**3. `getMemberContext` (`lib/actions/members.ts`) returns check-ins +
session history + measurements + open flags in one call**, rather than
four separate actions. *Why:* this is the literal shape of the coach
journey step in `docs/design/journeys.md` — "member context before they
walk in" — as one screen, one loading state. Splitting it into four
round-trips would be premature decomposition with no consumer that
wants them separately.

**4. No check-in *creation* action was built.** Check-ins are member-
self-reported per blueprint §4.1.7/§5, and this slice has no member
portal (`docs/adr/0008`'s staff-only scope). `getMemberContext` reads
`checkins` and will just show an empty state until Phase 2's member app
exists to write them — not a bug, an honestly-empty feature per
`CLAUDE.md`'s Definition of Done.

**5. `logSession` closes the booking and nothing else** — blueprint
§4.2.4 also lists "decrements credits, advances streak, recomputes
scores," all three of which depend on systems out of scope here
(credits/payments per `docs/adr/0007`, member-facing progress per this
slice's staff-only scope). Flagged in a code comment at the call site,
not silently dropped.

## 2026-08-11 — Bootstrap the first studio manager via a seed script, not a public sign-up route

**Change:** `db/seed.ts`, `lib/auth.ts`, `app/api/auth/[...all]/route.ts`.

**Chose:** No public sign-up UI or route is wired to `better-auth`'s
`signUpEmail` — the first studio manager is created by running
`npm run db:seed` with `SEED_MANAGER_EMAIL`/`SEED_MANAGER_PASSWORD` env
vars. Every staff account after that is meant to be created by an
authenticated studio manager through a `requireStudioManager()`-gated
server action (not built yet — next up with the studio manager console).

**Why:** Staff accounts are a privileged operation (they grant access to
member health data), not a public self-service flow — nothing in the
blueprint suggests open staff registration, and leaving `better-auth`'s
default sign-up endpoint reachable would let anyone who finds the route
create a coach or studio-manager account. A one-time seed script is the
smallest thing that solves "how does the very first person log in."

**Trade-off accepted:** The seed script's own account-creation call
(`auth.api.signUpEmail`) isn't authorization-gated — it can't be, it runs
before any session exists. It's meant to be run once, locally/via a
deploy hook with real secrets, not left reachable as an HTTP endpoint.

## 2026-08-11 — better-auth's schema generated via its own CLI, not hand-written

**Change:** `db/auth-schema.ts` (user/session/account/verification
tables), `drizzle.config.ts`'s `schema` option changed to an array
(`['./db/schema.ts', './db/auth-schema.ts']`), `db/index.ts` merges both
schema modules into one `drizzle()` call.

**Chose:** `npx @better-auth/cli generate --config lib/auth.ts --output
db/auth-schema.ts` over transcribing better-auth's table shape by hand
from memory or minified dist output.

**Why:** better-auth's internal table shape (column names, indexes,
`$onUpdate` triggers) is implementation detail that can drift between
versions; the CLI reads the actual installed version's schema
definition, so the generated file is guaranteed correct for
`better-auth@1.6.26` specifically rather than approximately right.
Kept as a separate file (not merged by hand into `db/schema.ts`) so it
stays mechanically regeneratable — a header comment says as much.

**Trade-off accepted:** Two schema files instead of one — a coding
agent unfamiliar with this pattern could edit `auth-schema.ts` directly
and have those edits silently discarded on the next regenerate. Flagged
in a comment at the top of the file itself, not just here.

## 2026-08-11 — Kept the out-of-scope root theme work rather than reverting it

**Change:** A background agent tasked with re-theming only `prototype/`
also applied the same brand tokens to root's `theme/theme.ts` and
`app/layout.tsx`, and rewrote `docs/design/design-system.md` — none of
which it was asked to touch, and none of which was planned or announced
before it happened.

**Chose:** Keep the root changes rather than revert them, confirmed
directly with the product owner.

**Why:** The work is technically sound (clean build, well-reasoned,
correctly sourced from the brand handoff) and inert — no root screens
exist yet to render against it, so nothing depends on it and nothing
breaks either way. Reverting verified, correct work just to re-do it
later at the "proper" time would be pure waste.

**Trade-off accepted:** Root's design system moved ahead of where the
Phase 1 staff-side plan (`docs/adr/0008`) had it, without a plan being
presented first — a real process miss (the agent should have stayed
scoped), not repeated deliberately. `docs/architecture/overview.md`'s
Design system row already reflects the actual state (token layer done,
no screens built against it).

## 2026-08-11 — Root theme implements the real brand handoff, replacing the placeholder palette

**Change:** Implemented the token layer only (palette, typography, shape/
radius, elevation reference, focus ring, tabular numerals) into
`theme/theme.ts` at root from `Marn wellness brand design system/
design_handoff_marn_app/`. Did not build the handoff's five member screens.

**Chose:** Dark-first `colorSchemes` (`dark` default, `light` also defined)
via MUI's CSS-variables theming, Petrona (display) + Figtree (UI/body) via
`next/font/google`, `font-variant-numeric: tabular-nums` globally instead of
a monospace face for measured values, and a plain exported `radii` constant
for the sub-`borderRadius` radius scale (MUI's typed `shape` option isn't
augmentable beyond `borderRadius` from a public import path).

**Why:** `docs/design/design-system.md` and `CLAUDE.md` both flagged the
prior "bone-and-ink" palette's hex values as placeholders (`«…»`) pending the
real brand; the handoff arrived as a separate design deliverable and is
explicitly high-fidelity/final on colour, type, spacing, and radius. Scoped
to the token layer, not the five member screens, because root's current
phase is staff-only (coach console + studio manager console per
`docs/adr/0008`) — no member-facing surface is mapped yet, so building those
screens now would be ahead of phase.

**Trade-off accepted:** The handoff fully specifies dark mode only; several
light-mode tokens (`surfaceRaised`, `lineStrong`, `text.muted`,
`primary.light`) are derived (reused from the nearest given token) rather
than designed, flagged inline in both `theme/theme.ts` and
`docs/design/design-system.md`. The ambient wash (per-tab gradient) and the
three elevation shadow levels are documented but not encoded as theme tokens
— no component exists yet to consume them, and encoding shadow strings
nobody can visually check against a real screen would be guessing.

## 2026-08-11 — Booking approval moves from coach to studio manager exclusively

**Change:** Kicking off the root product's first slice (coach console +
new studio manager console), confirmed via quiz rather than assumed.

**Chose:** The studio manager approves/declines/reassigns every booking;
the coach's schedule is read-only against already-confirmed bookings — not
the blueprint's as-written split (coach confirms own bookings, §4.2.2;
manager has "coach, plus" oversight, §10.2).

**Why:** Direct product-owner instruction for this slice: a named studio
manager runs the floor's operational decisions (shifts, booking approval,
capacity, earnings) while a coach's console stays scoped to exactly what a
session needs. Full reasoning and consequences in
`docs/adr/0008-studio-manager-role.md`; blueprint §4.2.1/§4.2.2/§10.2
amended in the same change with cross-reference notes.

**Trade-off accepted:** A coach loses visibility into their own upcoming
bookings' approval status changes in real time unless the studio manager
console also pushes updates to them — not built yet, flagged as a gap for
whoever builds the coach console next.

## 2026-08-11 — Staff auth starts on email+password, not phone-OTP

**Change:** Same slice as above — auth wasn't built yet, but the credential
method needed deciding before scaffolding it.

**Chose:** `better-auth`'s built-in email+password provider for coach/
studio-manager login now; phone-OTP (the blueprint's actual spec, §10.1)
deferred to Phase 2 member auth.

**Why:** Confirmed via quiz — phone-OTP needs an SMS vendor decision (its
own ADR under the Iron Rules, since it's a new vendor touching staff data)
that isn't load-bearing yet for a small internal staff roster, and would
slow down proving out the coach/studio-manager consoles. `better-auth`
itself — the library choice — is unchanged from the blueprint. Full
reasoning in `docs/adr/0009-staff-auth-simple-credential-first.md`.

**Trade-off accepted:** Staff log in with a password, not the phone-OTP
flow that will eventually be the product's primary and only auth path for
members — a known, temporary inconsistency, not a permanent one.

## 2026-08-11 — Root schema uses `postgres-js`, not the prototype's Neon driver

**Change:** First schema at the repo root (`db/schema.ts`), 11 tables for
the staff-side Phase 1 slice.

**Chose:** `drizzle-orm/postgres-js` (the `postgres` package) over
`drizzle-orm/neon-http` (`@neondatabase/serverless`), which the prototype
uses.

**Why:** `postgres-js` speaks plain Postgres wire protocol against any
host — Neon, RDS, Cloud SQL, local — with no code change, matching
`CLAUDE.md`'s "plain Postgres, portable" Iron Rule exactly. The prototype's
Neon-specific HTTP driver was a reasonable choice for a disposable demo on
Vercel's edge runtime, but the real product shouldn't inherit a
vendor-shaped dependency for its primary database access path. Full
reasoning (including the rest of the schema shape) in
`docs/adr/0007-root-schema-shape.md`.

**Trade-off accepted:** Loses Neon's HTTP-driver benefits (works from edge
runtimes without a TCP connection) — not a concern for a Node.js server
deployment, which is what this product targets.

## 2026-08-11 — `drizzle.config.ts` placed at repo root, not inside `db/`

**Change:** Same schema work as above.

**Chose:** `drizzle.config.ts` lives at the project root.

**Why:** Checked `drizzle-kit`'s own source
(`node_modules/drizzle-kit/bin.cjs`) — it only auto-discovers
`./drizzle.config.ts` relative to the current working directory, not inside
a subdirectory. The prototype's config sits at `prototype/db/drizzle.config.ts`,
which `prototype`'s own `npm run db:push` (`drizzle-kit push`, no
`--config` flag) would not actually find — a latent bug there, not
something to copy. Confirmed by running `npx drizzle-kit generate` at root
against this placement: it found the config and produced a valid migration.

**Trade-off accepted:** None — this is a straight correction, not a
trade-off.

## 2026-08-11 — Set up `decisions.md` and `flow.md` as living logs

**Change:** Added this file and `docs/flow.md`; updated `CLAUDE.md` to
require both are kept current alongside code changes, and to require
quizzing the user before major changes.

**Chose:** Two plain, hand-appended markdown logs under `docs/`, separate
from `docs/adr/`, rather than folding this into the existing ADR process or
extending `docs/architecture/overview.md`.

**Why:** ADRs are reserved for decisions that constrain the future — one per
decision, numbered, formal Context/Decision/Consequences writeup. What was
asked for is a lower-friction, higher-frequency log of *every* meaningful
decision (library vs. library, pattern vs. pattern, trade-off accepted),
which would make the ADR format too heavy to use consistently.
`docs/architecture/overview.md` already owns module-level "what exists and
its phase status"; a separate document was needed for function/file-level
call tracing, hence `flow.md` rather than overloading overview.md with a
different grain of detail.

**Trade-off accepted:** Two more files to keep current by hand, with no
tooling to catch a missed update — this relies on the workflow rule in
`CLAUDE.md` being followed each change, not automation.
