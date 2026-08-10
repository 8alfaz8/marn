# 0005 — Split the prototype into `prototype/`, build the real product at root

**Status:** Accepted
**Date:** 2026-08-10

## Context

Everything in the repo so far — the Next.js app under (former root) `app/`,
`components/`, `lib/`, `theme/`, `db/` — is the no-real-auth, no-provenance,
client-trusted prototype documented throughout `docs/architecture/overview.md`
and `docs/adr/0002-prototype-auth-gap.md`. It exists to prove the product
concept and the measurement UX, not to hold real member data.

The team is now ready to start the real customer-facing build, and wants the
prototype kept around and runnable — it's still the fastest way to demo the
product shape and to reference "how did the old build solve this" while the
real thing is under construction.

## Decision

- The prototype moved to `prototype/` as a self-contained Next.js app (own
  `package.json`, `node_modules`, `.env`, `tsconfig.json`) — `cd prototype &&
  npm run dev` still runs it exactly as before the move.
- `docs/` (blueprint, ADRs, architecture overview, design system, journeys),
  `CLAUDE.md`, and `AGENTS.md` stay at the repo root. They were already
  written as the spec for the *real* product, not prototype-specific, and now
  govern both trees — the real build is reconciled against the same
  blueprint, not a forked copy of it.
- The repo root now holds a bare Next.js + MUI shell for the real product
  (`app/layout.tsx`, `app/page.tsx`, `theme/theme.ts`) — MUI wired per
  `CLAUDE.md`'s design-system law, RTL-ready (`direction: 'ltr'` today, no
  physical-direction CSS), but with no feature code and no brand theme yet:
  the brand's colors/logo/fonts are being redone from scratch and will
  replace the placeholder MUI default theme once ready.
- `prototype/next.config.mjs` sets `agentRules: false`. Next.js 16 auto-writes
  a generic `CLAUDE.md`/`AGENTS.md` per Next project root on `next dev`/
  `next build`; left on, it would have created a second, competing pair of
  agent-instruction files inside `prototype/` that shadow the real ones for
  any agent working with `prototype/` as its cwd. The root's own
  `next.config.mjs` sets the same flag pre-emptively.

## Consequences

- Every code path in `docs/architecture/overview.md`'s module table is now
  relative to `prototype/`, not the repo root — noted inline there rather
  than rewritten per-row, to keep the diff honest and reviewable.
- The real product starts from zero feature code. Nothing in `prototype/` is
  assumed reusable as-is — real provenance fields, real server-side
  authorization, and the resource-booking model the blueprint calls out
  (§4.1.3) are gaps in the prototype specifically because it cut those
  corners; the real build should not copy the shortcut, even if it copies the
  UI shape.
- Two `node_modules`, two lockfiles, two `.env` files now exist
  (`prototype/` and root). They will drift in dependency versions over time;
  that's expected, not a bug — the prototype is a frozen reference, not a
  package the real product depends on.
