# 0010 — Neon as an interim database host, before real member data exists

**Status:** Accepted (bounded, temporary — same shape as `docs/adr/0002`)
**Date:** 2026-08-11

## Context

Blueprint §8.2 is explicit and names Neon specifically: "Managed platforms
without a UAE region — Supabase, Firebase, **Neon**, PlanetScale, Vercel's
own data products — are unavailable for the health tier in production.
**They are fine for the prototype precisely because it holds no real
data.**" §14.4 treats data-residency enforcement as a tracked risk
("severity: high, probability: low near-term, rising with scale"), whose
stated mitigation is the portability rule (§7.3): plain Postgres over a
connection string, no vendor extensions, so migration is "a connection
string and a container image."

The root product needs a real, live database to be testable at all — the
first two vertical slices (`docs/adr/0007`, `docs/adr/0008`) shipped with
no `DATABASE_URL` provisioned anywhere, which meant nobody could actually
log in or click through either console. The product owner asked to use
Neon for now, in a fresh project separate from the prototype's, explicitly
scoped to development/testing rather than a real launch.

## Decision

A new Neon project (`marn-root`, `aws-ap-southeast-1`) hosts the root
product's schema for as long as the product holds **no real member data**
— development, internal testing, demoing the coach/studio-manager consoles
to date. This is the same justification the blueprint already accepts for
the prototype, applied to root for the same reason: an empty or
synthetic-data database carries none of the regulatory weight §8 is
about.

This is explicitly **not** a decision to launch on Neon. Before any real
member is entered — before a real pilot studio opens with real PAR-Q
answers, real measurements, real contact details — this project's data
must move to UAE-hosted infrastructure per §8.2 and the Phase 4 roadmap
line ("migration to UAE-hosted production," §11). The trigger is "real
member data," not a calendar date.

Nothing about the application code is Neon-specific: `db/index.ts` uses
`drizzle-orm/postgres-js` over the plain TCP connection string (chosen for
exactly this portability in `docs/adr/0007`, before this ADR existed) —
migrating means provisioning a UAE-region Postgres instance, running
`npx drizzle-kit push` against it, and changing `DATABASE_URL`. No schema
change, no driver change, no query change.

## Consequences

- Blueprint §8.2 gets a one-line cross-reference to this ADR in the same
  change, rather than silently having a Neon project running against
  wording that names Neon as disallowed — the wording itself is not
  changed, because it remains correct for production; this ADR is the
  documented, bounded exception on the way there.
- `.env` (gitignored, not committed) holds the real `DATABASE_URL` for
  `marn-root`. The prototype's separate Neon project (`Marn`,
  `withered-dawn-78339489`) is untouched and stays prototype-only.
- Whoever eventually does the UAE migration should treat "does this
  database hold any real member's PII or health data yet" as the hard
  gate, not "has development finished" — the two are not the same
  question, and the risk this ADR accepts is scoped to the former being
  false.
- `db/seed.ts` was run once against `marn-root` to bootstrap the first
  studio manager (`manager@marn.studio`) and site (`Marn — Business Bay`).
  That account and any test data created against it are synthetic/pilot
  test data, not real members, and should be treated as disposable when
  migration happens — not carried over as if it were production data.
