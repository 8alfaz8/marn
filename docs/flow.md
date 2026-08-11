# Execution flow log

Traces how an action moves through the code — which file/function/module
calls which, in what order — for the paths that have actually been touched
under this process. Complements `docs/architecture/overview.md` (module
ownership and phase status) and `docs/decisions.md` (why a choice was made);
this file is strictly "what calls what."

Not a full trace of the existing codebase up front — populated
incrementally, one flow per change, as a change touches that path. A flow
entry is **updated in place** (not duplicated) the next time a change
touches the same path, so this stays a current map, not a chronological
diary.

## Entry format

```
## <Flow name — e.g. "Member PAR-Q submission">
**Entry point:** <route / component / CLI command>
**Path:**
1. `File.tsx` `ComponentName` (file:line) — <what it does> →
2. `file.ts` `functionName()` (file:line) — <what it does> →
3. ...
**Currently modifying:** <step number(s) and what the active change does
there — remove this line once the change lands; the rest becomes the static
record>
```

---

## Root app boot — fonts, theme, providers

**Entry point:** any request to the root Next.js app (`app/`)
**Path:**
1. `app/layout.tsx` `RootLayout()` (app/layout.tsx:29) — loads Petrona/Figtree via `next/font/google`, exposes them as CSS variables (`--font-petrona`, `--font-figtree`) on `<html className>` →
2. `app/layout.tsx` — renders `InitColorSchemeScript` (inline, pre-hydration) to stamp `data-mui-color-scheme` on `<html>` before paint, avoiding a light/dark flash →
3. `theme/theme.ts` `theme` (theme/theme.ts:43) — `createTheme()` with `cssVariables` + `colorSchemes.dark`/`.light`, reading the two font CSS variables into `typography.*.fontFamily` →
4. `app/layout.tsx` — `AppRouterCacheProvider` → `ThemeProvider theme={theme}` → `CssBaseline` (applies the `MuiCssBaseline` override: `tabular-nums`, focus ring) → `{children}`

---

## Staff sign-in and console routing

**Entry point:** `/login`
**Path:**
1. `app/login/page.tsx` `LoginPage()` `onSubmit` (app/login/page.tsx:26) — client form calls `signIn.email()` →
2. `lib/auth-client.ts` `signIn` (lib/auth-client.ts:8) — better-auth react client, POSTs to `/api/auth/sign-in/email` →
3. `app/api/auth/[...all]/route.ts` `POST` — `toNextJsHandler(auth)` from `lib/auth.ts`'s `betterAuth()` config, sets the session cookie →
4. on success, client `router.push('/')` →
5. `app/page.tsx` `Home()` (app/page.tsx:6) — `getStaffSession()` (`lib/authz.ts:21`) resolves the cookie to a `staff` row, then `redirect()`s to `/coach` or `/studio` by `role` (or `/login` if no session)

`app/coach/page.tsx`, `app/studio/page.tsx`, and `app/superadmin/page.tsx`
all repeat the same `getStaffSession()` + role-mismatch redirect at the top
of the route, not just here — this is the front door, not the only lock
(every `lib/actions/*.ts` function re-authorizes independently underneath
it). The mismatch redirect target is `roleHome(session.role)`
(`lib/authz.ts`), not a hardcoded sibling route — a superadmin bouncing off
`/studio` lands on `/superadmin`, not `/coach`.

## Studio manager: manual booking creation, with overlap protection

**Entry point:** `/studio` Floor tab, "New booking" form
**Path:**
0. `components/studio/TimeSlotPicker.tsx` — once member/coach/service/date are all picked, fetches `getCoachDayAvailability()` (`lib/actions/bookings.ts`) and renders one chip per candidate start time, disabling any that fall outside the coach's assigned shift or overlap an existing booking (`lib/scheduling.ts`'s `computeFreeSlots`) — a manager can only ever *select* a slot the write path would also accept →
1. `components/studio/FloorPanel.tsx` `onSubmit` (components/studio/FloorPanel.tsx) — client form collects member/coach/service/date/time, calls `createBooking` →
2. `lib/actions/bookings.ts` `createBooking()` — `requireStudioManager()` gate, opens `db.transaction()` →
3. `lib/actions/bookings.ts` `assertNoOverlap()` (same file) — `lib/scheduling.ts`'s `bookingRange()` computes the candidate `[start,end)`, rejects outside `STUDIO_HOURS`; queries same-day bookings sharing either the coach or the member; `computeBusyRanges()` + `rangesOverlap()` check both, throwing a plain `Error` (surfaced verbatim to the UI by `components/studio/primitives.tsx`'s `useFormSubmit`) on either conflict →
4. on no conflict, the same transaction inserts the `bookings` row as `confirmed` →
5. after the transaction commits, `logAudit(..., 'booking_approved', ...)` (`lib/audit.ts`) — outside the transaction, matching the pre-existing pattern (audit logging is best-effort, not part of the write's atomicity guarantee).

`rescheduleBooking()` and `reassignCoach()` (same file) share step 3's `assertNoOverlap()` via `loadActiveBooking()` (loads + site-scopes + status-gates the target booking first, `excludeBookingId` lets the booking's own current slot stay "free" during the check), wired to `components/studio/FloorPanel.tsx`'s `RescheduleAction`/`ReassignAction` row-level `Popover`s (module-scope, share the panel's single `useFormSubmit` `run` so success/error surface through the one Alert this panel already has) — each success callback also calls `refreshDay()` (`getDaySchedule(viewDate)`) so the floor table and `components/studio/DayTimeline.tsx` update without a page reload.

## Studio manager: member detail drawer

**Entry point:** `/studio` Members tab, "View details" row action
**Path:**
1. `components/studio/MembersPanel.tsx` — `setSelected(member)` on click, renders `MemberDetailDrawer` with that member →
2. `components/studio/MemberDetailDrawer.tsx` — on open, `Promise.all([getMemberContext(member.id), getMemberBookingHistory(member.id)])` →
3. `lib/actions/members.ts` `getMemberContext()` — `requireStaff()` + `assertMemberInScope()` (full-detail pass-through for `studio_manager`), returns identity/checkins/sessions/assessments/measurements/flags — same function `components/coach/MemberContextPanel.tsx` calls, role-branched identity →
4. `lib/actions/bookings.ts` `getMemberBookingHistory()` — `requireStudioManager()` + `assertMemberInScope()`, site-scoped booking rows, newest first →
5. drawer renders three read-only sections (Measurements, Session history, Booking and charge history) from the combined result.

## Superadmin: acting as another staff member ("View as")

**Entry point:** the "View as" dropdown in the AppBar, on any console
**Path:**
1. `components/StaffChrome.tsx` renders `ImpersonationSwitcher` only when its `impersonation` prop is non-null — set by `getImpersonationContext()` (`lib/actions/impersonation.ts`), which returns `null` for anyone whose **real** session isn't an active superadmin. All three pages (`app/{coach,studio,superadmin}/page.tsx`) fetch it alongside their own reads →
2. selecting a name → `startImpersonation(staffId)` — authorizes via `getRealStaffSession()` (never `getStaffSession()`, which would report the borrowed role), validates the target is an active non-superadmin, sets the httpOnly `marn_act_as` cookie, `logAudit(realSuperadminId, 'staff_impersonated', ...)` →
3. client `router.push('/')` → `app/page.tsx` → `roleHome(session.role)` routes to whichever console the *effective* role now owns →
4. every subsequent request: `lib/authz.ts` `getStaffSession()` → `getRealStaffSession()` first; if that's an active superadmin **and** the cookie is present **and** the target row is still active and non-superadmin, returns the target's session with `impersonatedBy` set; otherwise falls back to the real session. Every existing `require*`/action underneath is unchanged and simply sees the effective identity →
5. `ImpersonationBanner` (same file as the switcher) renders under the AppBar whenever `impersonatedBy` is set; its "Back to superadmin" calls `stopImpersonation()` → cookie deleted → step 3's routing runs again, landing back on `/superadmin`.

## Superadmin: overview dashboard, coach workload, cash ledger

**Entry point:** `/superadmin` (Overview tab, default)
**Path:**
1. `app/superadmin/page.tsx` — session/role gate (`getStaffSession` + `roleHome`), then `Promise.all([getSuperadminDashboard(), getCoachWorkload(), getCashLedger()])` →
2. `lib/actions/dashboard.ts` `getSuperadminDashboard()` — `requireSuperadmin()`, 4 unscoped/near-unscoped queries (`sites`, today's bookings, 7d bookings, active staff), grouped per site in JS, plus a reduced platform total →
3. `lib/actions/coachWorkload.ts` `getCoachWorkload()` — `requireStudioManagerOrSuperadmin()` (shared with the studio console's future use of the same action), no `siteId` arg here so every site's coaches are included; shift/booking/session queries scoped to the coach id list, hours computed via `lib/scheduling.ts`'s `timeToMinutes` →
4. `lib/actions/cashLedger.ts` `getCashLedger()` — `requireSuperadmin()`, unions derived booking revenue (`bookings.aed` where `status='completed'`) with manual `cash_ledger` rows, sorted newest-first →
5. `components/superadmin/SuperadminConsole.tsx` → `OverviewPanel.tsx` renders all three; the ledger panel's "Record a cash entry" form calls `recordCashEntry()` (same file as `getCashLedger`), which `router.refresh()`s on success to pull the new entry back through step 4.

## Superadmin: create a studio, create/reassign staff to it

**Entry point:** `/superadmin` Studios & staff tab
**Path (create site):**
1. `components/superadmin/StudiosPanel.tsx` `onCreateSite` → `createSite()` (`lib/actions/staff.ts`) — `requireSuperadmin()`, inserts a `sites` row, `logAudit(..., 'site_created', ...)`.

**Path (create staff at a site):**
1. Same panel's second form → `createStaffAccountForSite()` — `requireSuperadmin()`, `auth.api.signUpEmail()` then inserts a `staff` row with the caller-chosen `siteId`/`role` (`'coach'|'studio_manager'` only — never `'superadmin'`, see `docs/decisions.md`).

**Path (reassign existing staff):**
1. `StudiosPanel.tsx`'s `ReassignAction` (module-scope, same Popover pattern as `components/studio/FloorPanel.tsx`) → `assignStaffToSite()` — `requireSuperadmin()`, updates `staff.siteId`, `logAudit(..., 'staff_site_assigned', ...)`.

All three call `router.refresh()` on success (via the shared `useFormSubmit`), which re-runs `app/superadmin/page.tsx`'s `getSites()`/`getAllStaff()` server-side and flows fresh props back down — same mechanism as every other write in either console.

## Coach: member context load and in-place capture

**Entry point:** `/coach`, selecting a member from the schedule or roster
**Path:**
1. `app/coach/page.tsx` `CoachPage()` (app/coach/page.tsx:12) — `getStaffSession()` + role gate, then `getCoachScheduleToday()`/`getCoachMembers()` in parallel, narrowed field-by-field before reaching the client →
2. `components/coach/CoachConsole.tsx` `onSelect()` (components/coach/CoachConsole.tsx:183) → `load()` (components/coach/CoachConsole.tsx:170) →
3. `lib/actions/members.ts` `getMemberContext()` (lib/actions/members.ts:68) — re-authorizes via `requireStaff()`, then `assertMemberInScope()` (`lib/authz.ts:76`) before touching any per-member table →
4. `components/coach/MemberContextPanel.tsx` renders the result; `MeasurementCapture`/`SessionLogForm` (`components/coach/CaptureForms.tsx`) call `createManualAssessment`/`logSession` on save →
5. save calls `onChanged()` back in `CoachConsole.tsx`, which re-runs step 2–3 (stale-while-revalidate — the panel never unmounts) and `router.refresh()`s the server-fetched schedule/roster

## Studio manager: manual booking intake

**Entry point:** `/studio`, "New booking" form on the Floor tab
**Path:**
1. `app/studio/page.tsx` `StudioPage()` (app/studio/page.tsx:18) — `getStaffSession()` + role gate, then five reads in parallel including `getManagerDashboard()` (`lib/actions/dashboard.ts`) →
2. `components/studio/FloorPanel.tsx` `onSubmit()` (components/studio/FloorPanel.tsx:57) — price/duration read from `lib/reference.ts`'s `SERVICES`, never typed →
3. `lib/actions/bookings.ts` `createBooking()` (lib/actions/bookings.ts:39) — `requireStudioManager()`, inserts a `confirmed` booking with a coach already assigned (no separate request-then-approve step in this slice — `docs/decisions.md`, 2026-08-11), writes an audit log row →
4. `components/studio/primitives.tsx` `useFormSubmit()`'s `run()` shows the success `Snackbar` and calls `router.refresh()`, which re-runs step 1 server-side
