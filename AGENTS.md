# AGENTS.md

Canonical instructions live in **CLAUDE.md** (same directory) — read it first. It binds the blueprint (`docs/blueprint/`), the architecture map (`docs/architecture/overview.md`), and the design system (`docs/design/design-system.md`). Non-negotiables for any coding agent working on Marn:

1. **Marn is a measurement company delivered through studios.** Work that doesn't produce, protect, or reveal a member's measured change is not the priority.
2. **Think before coding; simplicity first; surgical changes; goal-driven execution.** Full scope of the mapped capability, minimal implementation. Every changed line traces to the request.
3. **Measurement provenance is mandatory** (`source`, `instrument`, `protocol_version`, `measured_at`, `measured_by`). Derived values never occupy a measured column.
4. **Wellness studio, not a clinic.** No diagnosis or treatment language anywhere in copy or generated text. Safety flags gate activity until a named human clears them.
5. **Health data never enters logs, traces, analytics, or third-party payloads.** New vendor touching member data = ADR, not a config change.
6. **BodyMap stays behind its adapter**; domain code must work with manual entry alone.
7. **Authorization server-side, every read and write.** Corporate portal sees aggregates only.
8. **UI:** Material UI components, theme tokens and the `sx` prop only — no hardcoded colours, fonts, or pixel spacing, no re-implemented MUI components. Build to the member and coach journeys in `docs/design/journeys.md`; empty and first-run states are part of the feature.
9. **Never** define sub-components inline inside a parent — remounts wipe in-progress form state on every poll.
10. **Before commit:** checked-in Drizzle migration for any schema change, `npm run check` green, conventional commit, ADR for future-constraining decisions, no secrets in git.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
