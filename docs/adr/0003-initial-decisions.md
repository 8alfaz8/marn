# 0003 — Initial architecture decisions from the blueprint

**Status:** Accepted (already reasoned through in `docs/blueprint/marn-blueprint.md`; recorded here as an ADR so they're findable without reading all fifteen chapters)
**Date:** 2026-08-10

Numbered `0003` rather than `0001` because two ADRs already exist in this
directory (`0001-parq-self-service.md`, `0002-prototype-auth-gap.md`),
written during an earlier round of work on this repo, and are already
referenced by exact filename from `CLAUDE.md` and from code comments. These
three decisions chronologically predate both, but renumbering would mean
updating every cross-reference for no functional gain.

## 1. Neon + Vercel for the prototype, not for production

**Decision:** the prototype runs on Vercel (hosting) and Neon (managed Postgres), chosen for speed to a shareable demo link. **Why:** Neon's free tier doesn't pause a project into unavailability after a week of inactivity, which matters when an investor might open the link on a quiet Tuesday — and neither platform has a UAE region, so this choice is explicitly scoped to holding no real member data (blueprint §8.2). **What it forecloses:** production cannot launch on this stack as-is. UAE Federal Law No. 2 of 2019 restricts health data generated in the UAE from being stored outside it, and joint angles / pain scores / HRV read as health data on any reasonable interpretation (§8.1) — so before the first real member record exists, the app must move to a UAE-resident region (AWS `me-central-1`, Azure UAE North, or a local provider — still **OPEN** per the blueprint). This decision is why §7.3's portability rule (below) exists at all: the migration has to be cheap when it comes.

## 2. Plain Postgres over a connection string, no vendor extensions

**Decision:** the database is reached by a plain `DATABASE_URL` connection string. No Supabase client libraries, no PostgREST-from-the-browser, no row-level-security-as-authorization, no vendor-proprietary primitive anywhere in the codebase (blueprint §7.3). Authorization logic lives in application code, not database policies. **Why:** every one of the alternatives is a good tool that welds the application to a vendor with no UAE region — and per decision 1, that vendor lock-in is precisely what would turn the required Neon→UAE migration from "a connection string and a container image" into a rewrite at the exact moment a corporate client's procurement team asks where the data lives (§14.4). **What it forecloses:** several conveniences stay off the table permanently, not just for the prototype — no Supabase Auth, no PostgREST for quick read endpoints, no database-level row security as the authorization mechanism. `db/schema.ts`'s own header comment states the same rule locally: "nothing here is Neon-specific... moving to RDS in me-central-1 is a change of `DATABASE_URL`." That claim is only true as long as this decision holds.

## 3. BodyMap anti-corruption layer — one canonical shape, three adapters

**Decision:** no BodyMap-specific data format, field name, or unit assumption is allowed to touch the database or domain code directly. Every measurement — regardless of source — lands on one shape, `NormalisedMeasurement[]`, via an adapter (`lib/adapters/bodymap.ts`). Three adapters are named: `fromDeviceApi` and `fromExportFile` (both stubs, signatures fixed, blocked on vendor information the team doesn't have) and `fromManualEntry` (implemented, always available). **Why:** the BodyMap device's integration surface is genuinely unknown — no confirmed API, export format, or device identifier scheme exists yet (blueprint §5.6) — and the measurement dataset is the actual product (§1.2), so the boundary that protects it from an unknown or changing vendor format is the single highest-leverage piece of the whole system to get right early. **What it forecloses:** the domain code, the scoring engine, and every UI surface are written against `NormalisedMeasurement[]` and must never special-case a BodyMap field name — which also means manual entry has to stay fully first-class forever, not a fallback grudgingly retained, because it's what lets the pilot run before any device integration exists and what makes a second measurement vendor a one-file change instead of a rewrite. Today's code follows this correctly: nothing outside `lib/adapters/bodymap.ts` imports or references a BodyMap-shaped type.
