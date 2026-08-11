# Known vulnerabilities

Security findings that are **accepted and deferred**, not fixed. Raised by a
security review of the `feat/scheduling-superadmin-impersonation` branch on
2026-08-11 (commit `e4aa407`), triaged by the product owner the same day:
*"lets fix it after some time."*

This file is the register, not a backlog dump — everything here has been
independently verified against the source, has a confirmed exploit path, and
is deliberately still open. Anything fixed moves to the Fixed section at the
bottom with the commit that closed it, rather than being deleted.

**Working agreement:** these are picked up at the start of the next phase of
work, before new feature scope. See `docs/architecture/overview.md` for phase
status.

---

## V1 — Privilege escalation: studio manager → superadmin

| | |
|---|---|
| **Severity** | **High** |
| **Confidence** | 9/10 — verified against source, no runtime reproduction |
| **Category** | Broken access control / privilege escalation |
| **Location** | `lib/actions/staff.ts:28` (`createStaffAccount`), same shape at `:87` (`createStaffAccountForSite`) |
| **Introduced by** | `db/schema.ts:16` + `drizzle/0001_freezing_groot.sql:7` adding `'superadmin'` to the `staff_role` enum |
| **Status** | **Open** |

### What's wrong

`createStaffAccount` is callable by any **studio manager** and writes the
client-supplied `role` straight into the `staff` table with no runtime check:

```ts
const session = await requireStudioManager();   // authorizes the CALLER, not the payload
const { user } = await auth.api.signUpEmail({ ... });
await db.insert(schema.staff).values({ ..., role: input.role, siteId: session.siteId });
```

The `role: 'coach' | 'studio_manager'` parameter type is TypeScript only and
is erased at runtime. Next.js does not validate server-action arguments — it
verifies the action ID and deserializes the payload, nothing more. There is
no validation library in the application tree (`zod` is present only as a
transitive `better-auth` dependency), no `middleware.ts`, and no
action-wrapping helper.

**Before this change, Postgres was the only thing rejecting
`role: 'superadmin'`. The migration removed that.** The restriction is now
purely cosmetic and client-side — `components/studio/StaffPanel.tsx:44-46`
says as much in a comment.

The code documents the invariant it fails to enforce, at
`lib/actions/staff.ts:76-79`: *"Not 'superadmin': that role is seeded only
(docs/adr/0011), never self-service-created, even by another superadmin."*

### Exploit path

1. Sign in as any studio manager, land on `/studio`.
2. Submit the "create staff account" form once with DevTools open; capture
   the POST carrying the `Next-Action` header and serialized arguments.
3. Replay it with `role: "superadmin"` (curl or "Edit and Resend").
   `requireStudioManager()` still passes — the caller is a real manager — and
   Postgres now accepts the value. The row inserts.
4. Sign in as the new account. `toSession()` (`lib/authz.ts:37`) returns
   `role: 'superadmin', siteId: null`, **discarding** the `siteId` written at
   insert time. The account is genuinely un-site-scoped.

### Impact

Full platform compromise from a single-site role:

- `assertMemberInScope` (`lib/authz.ts:169`) short-circuits for superadmin —
  **every member's health measurements, safety flags, and contact details at
  every site**. This breaches the health-data Iron Rule directly.
- `getCashLedger` / `recordCashEntry` — cross-site financial data.
- `startImpersonation` — act as any active coach or studio manager anywhere.
- `createSite`, `assignStaffToSite`, `getSuperadminDashboard`.

**Stealth amplifier:** both `getAllStaff()` (`lib/actions/staff.ts:66`) and
`getImpersonationOptions()` (`lib/actions/impersonation.ts:33`) filter out
`role !== 'superadmin'`. A smuggled superadmin row is **invisible in the
legitimate platform owner's own staff console**.

### Fix

Runtime allowlist in the action body, after `require*()` but **before**
`signUpEmail` so a rejected attempt leaves no orphaned better-auth user:

```ts
const CREATABLE_ROLES = ['coach', 'studio_manager'] as const;
if (!CREATABLE_ROLES.includes(input.role as (typeof CREATABLE_ROLES)[number])) {
  throw new ForbiddenError('Invalid role');
}
```

Apply at **both** `createStaffAccount` and `createStaffAccountForSite`. The
latter isn't an escalation (its caller is already superadmin) but violates
the same documented invariant and would create accounts hidden from
`getAllStaff`.

A DB `CHECK` constraint would **not** help — `toSession` discards `siteId`
for superadmin rows regardless. The application-layer check is the fix.

**Before deploying the fix, audit existing `staff` rows for unexpected
`superadmin` values.**

---

## V2 — Cross-site staff references accepted on write

| | |
|---|---|
| **Severity** | **Low** (originally reported Medium; downgraded on validation) |
| **Confidence** | 7/10 — real missing check, contingent exploit path |
| **Category** | Broken access control (IDOR / cross-tenant write) |
| **Location** | `lib/actions/bookings.ts:205` (`reassignCoach`), `:130` (`createBooking`), `lib/actions/shifts.ts:9` (`assignShift`) |
| **Status** | **Open** (partially mitigated — see below) |

### What's wrong

`reassignCoach(bookingId, coachId)` scopes the *booking* correctly via
`loadActiveBooking(tx, bookingId, session.siteId)`, but never validates that
the incoming `coachId` is an **active coach at the caller's site**. The only
constraint is the `bookings.coach_id → staff.id` foreign key, which enforces
existence only — a `studio_manager` or `superadmin` id would be accepted too.

This is inconsistent with the read path added in the same change:
`getCoachDayAvailability` (`bookings.ts:108,112`) pins both its queries to
`session.siteId`. The read scopes; the write doesn't.

Same gap in `assignShift` (`lib/actions/shifts.ts:9`), which writes
`staffId: input.staffId` with `siteId: session.siteId` and no membership
check — arguably the worst of the three, since it puts a foreign coach onto
your site's shift table, which then feeds `getCoachDayAvailability`.

`getCoachScheduleToday` (`bookings.ts:59-66`) filters on `coachId` + `date`
with **no site predicate**, which is what converts the bad write into a
cross-tenant read.

### Exploit path and why it's Low

A Site-A manager calls `reassignCoach` with a Site-B coach's staff id; that
coach's console then renders a Site-A booking.

Bounding factors:

- **No manager-reachable surface leaks cross-site staff ids.**
  `getStaffRoster`, `getCoaches`, `getManagerDashboard`, `getUpcomingShifts`,
  `getDaySchedule` are all site-scoped; `getAllStaff` and
  `getImpersonationOptions` are superadmin-gated. Ids are
  `staff_${randomUUID()}` — not guessable.
- **But there is a deterministic acquisition path:** `assignStaffToSite`
  (`staff.ts:70-74`) moves a coach between sites without rewriting historical
  rows. A manager who had that coach before the move — or who reads
  `coachId` off any historical booking — holds a now-foreign valid id. Coach
  transfers between studios are ordinary.
- **Disclosure is bounded.** `app/coach/page.tsx:27-33` strips `aed` and
  `siteId`; `getCoachMembers` is site-scoped so the foreign member never
  resolves to a name; `assertMemberInScope` blocks `getMemberContext`,
  session logging, and flag raising for that member. Net leak: an opaque
  member identifier plus appointment metadata. **No health data or PII
  crosses the boundary.**

### Partial mitigation already in place

`createBooking` has since gained `assertMemberInScope(session, input.memberId)`
(`bookings.ts:139`), closing the `memberId` half of this finding for that one
path. The `coachId` half is still open in all three functions.

### Fix

One shared guard in `lib/authz.ts`, mirroring `assertMemberInScope`:

```ts
export async function assertStaffAtSite(siteId: string, staffId: string, role?: 'coach') {
  const [row] = await db.select().from(schema.staff).where(eq(schema.staff.id, staffId)).limit(1);
  if (!row || !row.active || row.siteId !== siteId) throw new ForbiddenError('Staff not at your site');
  if (role && row.role !== role) throw new ForbiddenError('Not a coach');
  return row;
}
```

Call it in `reassignCoach` (before `assertNoOverlap`), `createBooking`, and
`assignShift`. Separately add `eq(schema.bookings.siteId, session.siteId)` to
`getCoachScheduleToday` — worth doing regardless, since that predicate is
what turns any future coach-id mismatch into a disclosure.

---

## Cross-cutting: no input validation layer

Both findings above are instances of the same root cause, worth fixing once
rather than case by case:

**Every server action in `lib/actions/*` trusts client-supplied argument
shapes.** Authorization (`require*`) is consistently correct and applied
everywhere — the gap is purely *payload* validation. TypeScript parameter
types give zero runtime protection, and Next.js validates nothing beyond the
action id.

Other latent instances of the same shape (low impact today, same failure
mode): `lib/actions/cashLedger.ts:11` (`type: 'manual_in' | 'manual_out'` —
Postgres still rejects out-of-enum values, so currently contained).

**Recommendation:** introduce `zod` (or equivalent) and validate at the entry
of every server action. This is a new dependency and a repo-wide pattern, so
per `CLAUDE.md` it needs an ADR before it's adopted.

---

## Reviewed and found sound

Recorded so the next review doesn't re-litigate these:

- **Impersonation** (`lib/authz.ts:75-89`, `lib/actions/impersonation.ts`):
  cookie is httpOnly, `secure` in production, holds only a staff id, is
  worthless without a concurrent real-superadmin session, is re-validated
  against the live row on every request, and refuses `superadmin` targets —
  it can only ever *narrow* privilege. Mutating impersonation actions all
  authorize against `getRealStaffSession()`, which is the correct call.
- **Discriminated-union `StaffSession`**: the `row.siteId as string` cast
  (`lib/authz.ts:40-41`) is unchecked, but a null `siteId` on a coach/manager
  row fails closed (`site_id = NULL` matches nothing) rather than opening
  access.
- **Superadmin read actions** — `getSuperadminDashboard`, `getCashLedger`,
  `getSites`, `getAllStaff`, `createSite`, `recordCashEntry` all gated by
  `requireSuperadmin()`. `getCoachWorkload` correctly forces `session.siteId`
  for a studio manager, ignoring the client-supplied argument.
- **No SQL injection surface** — all queries use Drizzle's parameterized
  builder; no raw SQL, no `dangerouslySetInnerHTML`, no `eval`.
- **`db/seed.ts`** superadmin bootstrap reads credentials from env with no
  hardcoded fallback.

---

## Fixed

_(none yet)_
