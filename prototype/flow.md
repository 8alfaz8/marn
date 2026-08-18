# Execution flow log — prototype

This is `prototype/`'s copy of the pattern defined in the root `docs/flow.md`:
traces how an action moves through the code — which file/function/module
calls which, in what order.

**This file is a retroactive trace, not an incrementally-built one.**
`prototype/` was fully built before this file existed, so every flow below was
reconstructed on 2026-08-11 by reading the actual source (not inferred) and
confirming each file:line reference against the real file. Because nothing is
being actively changed while this was written, entries have no
**Currently modifying** line — each is marked `n/a — retroactive trace`. If
`prototype/` is touched again, update the relevant flow in place per the root
file's rule (don't duplicate it), and add a real **Currently modifying** line
for the duration of that change.

## Entry format

Same as the root file:

```
## <Flow name>
**Entry point:** <route / component / CLI command>
**Path:**
1. `File.tsx` `ComponentName` (file:line) — <what it does> →
2. ...
**Currently modifying:** n/a — retroactive trace
```

---

## Category/person picker → identity cookie → route access

**Entry point:** `GET /` (`prototype/app/page.tsx`)

**Path:**
1. `app/page.tsx` `GatePage()` (app/page.tsx:5-11) — calls `getIdentity()`; if a cookie already identifies a role, redirects straight to `/member`, `/coach`, `/manager`, or `/admin`; otherwise renders `<Gate />` →
2. `lib/session.ts` `getIdentity()` (lib/session.ts:16-25) — reads the `marn_who` httpOnly cookie, JSON-parses `{kind, id}` (`kind` now `member | coach | manager | admin`), returns `null` if absent/malformed →
3. `components/Gate.tsx` `Gate()` — fetches `GET /api/directory` (id/name/siteId only, not the full snapshot — see the API dispatcher notes below) on mount; a `ToggleButtonGroup` picks the category (studio manager / coach / user), a site `ToggleButtonGroup` narrows the pool, and an MUI `Autocomplete` searches within it (by name, i.e. by number, since every demo person is `Test User (###)`). "Continue as …" calls `openAs()`. A separate "Platform admin" card calls `openAs('admin', 'admin')` directly, bypassing the category picker →
4. `components/Gate.tsx` `openAs()` — `POST /api/session` with `{kind, id}`, then `router.push()` to the matching route (`/member`, `/coach`, `/manager`, or `/admin`) →
5. `app/api/session/route.ts` `POST()` (app/api/session/route.ts:6-14) — sets the `marn_who` cookie (httpOnly, 30-day maxAge) to `{kind, id}` — no validation that `id` is real or that the caller is entitled to it (still not real authorization, see docs/adr/0002) →
6. `app/member/page.tsx` / `app/coach/page.tsx` / `app/manager/page.tsx` / `app/admin/page.tsx` (each file, lines 5-9) — server component calls `getIdentity()` again on the new route; redirects to `/` if the cookie's `kind` doesn't match the route, otherwise renders `<Member memberId>` / `<Coach coachId>` / `<Manager managerId>` / `<Admin />`.

Signup path branches at step 3: `Gate.tsx`'s `createMember()` calls `POST /members` with a chosen `siteId` (see the assessment/session flows below for the general `api()`/dispatcher pattern) before calling `openAs('member', ...)` at step 4.

Sign-out / role switch / person switch: `components/Chrome.tsx` fetches its own `GET /api/directory` independently of the page's `snap` prop (a coach- or member-scoped snapshot doesn't carry every other studio's roster). `switchAccount()` calls `DELETE /api/session` then routes back to `/`. `switchRole()` (the Manager/Coach/Member/Admin `ToggleButtonGroup`) jumps to the first person of the target role at the current identity's own site (falling back to the pool's first entry, or straight to `admin` with no id lookup). The `TextField select` beside it — "the top-bar person switcher" — swaps to any person of the *current* role across *all three* sites (not site-restricted, unlike the role switch), using the same `openAs()`/`POST /api/session`/`router.push()` sequence as step 4/5 above. A site-filter `ToggleButtonGroup` (new, 2026-08-19, `docs/adr/0018` point 5/6) narrows that person pool before the select renders it — "your site" by default, "all," or any specific studio, purely a UX default since this tree has no real authorization to gate anyway.

`Chrome.tsx` is collapsible as of 2026-08-19 (product owner batch UI/UX review): defaults collapsed to a small floating `Fab` (role icon, top-inline-end), state in `localStorage` (`marn_chrome_collapsed`). While expanded, the rendered `AppBar`'s live height is measured via a `ResizeObserver` and exposed as the `--marn-header-offset` CSS var on the `<main>` wrapper, which `Manager.tsx`/`Coach.tsx`/`Admin.tsx` read to dock their own sticky tab-bar row directly under it (`position: sticky; top: var(--marn-header-offset, 0px)`) rather than under it colliding or a hardcoded guess.

Same change also fixed a real browser-back bug: `openAs()`/`switchAccount()` set the identity cookie via a plain `fetch()`, not a Server Action, so Next's client-side back/forward cache (`invalidateBfCache()`, App Router internals) never learned the cookie had changed — pressing the browser's back button from e.g. `/member` could restore the pre-login snapshot of `/` instead of asking the server again, landing back on the persona picker even with a still-valid identity. Fixed by calling `router.refresh()` immediately after the cookie mutation in both `Chrome.tsx` and `Gate.tsx`'s `openAs()`, which invalidates that cache.

**Currently modifying:** n/a — settled as of 2026-08-19, see decisions.md

---

## Manager console: floor view, shift assignment, manual booking, request approval

**Entry point:** `GET /manager` (`app/manager/page.tsx`), reached via the Gate's "Studio manager" category or Chrome's role switch.

**Path:**
1. `app/manager/page.tsx` — resolves `managerId` from the identity cookie, renders `<Manager managerId>` →
2. `components/Manager.tsx` `Manager()` — `useSnapshot({ kind: 'manager', id: managerId })` (`lib/store.ts`) polls `GET /api/snapshot?scope=manager&id=<managerId>` →
3. `app/api/[...path]/route.ts` `snapshot()` — resolves the manager's `siteId` from the `managers` table, then applies `scopeSnapshotForManager(full, siteId)` (`lib/reference.ts`) — every coach/member/booking/shift at that site, plus the sessions/assessments/measurements/programs/checkins keyed to those members. Unlike the coach/member scopes, this is a *site* scope, not a *relationship* scope: a manager sees the whole floor, not just people they've personally touched →
4. **Floor tab** — `DayTimeline` (`components/DayTimeline.tsx`) renders one row per coach for the viewed date, shift windows shaded and bookings as blocks, from the already-scoped `snap.shifts`/`snap.bookings`/`snap.coaches`. The intake form's `TimeSlotPicker` (`components/TimeSlotPicker.tsx`) calls `GET /api/coaches/:id/availability?date&serviceId` on every coach/service/date change, which runs `computeFreeSlots` (`lib/scheduling.ts`) against that coach's real shifts and bookings for the date; submitting calls `POST /bookings/manual`, which re-validates the same way server-side before inserting a `confirmed` booking. `RescheduleAction`/`ReassignAction` (module-scope, inside `Manager.tsx`) are the same pattern against `POST /bookings/:id/reschedule` / `/reassign` →
5. **Requests tab** — `ApproveAction` (module-scope) picks a coach and calls the existing `POST /bookings/:id/confirm` (unchanged from the coach console's own confirm path — a manager and a coach approve through the identical write path) or `POST /bookings/:id/decline` →
6. **Staff tab** — shift assignment form calls `POST /shifts` (inserts a row, no overlap check against that coach's other shifts — a manager can double-book a coach's own shift, only bookings are overlap-guarded); "Add a coach" calls `POST /coaches` with the manager's `siteId` →
7. **Members tab** — roster from the scoped `snap.members`; "Add a member" calls `POST /members` with the manager's `siteId`.

**Currently modifying:** n/a — settled as of 2026-08-18, see decisions.md

---

## Member PAR-Q submission (self-service readiness screening)

**Entry point:** "Start screening" button on the Member Today tab (`components/Member.tsx`'s `parqCallout()`) or the "Readiness screening outstanding" alert on the booking flow.

**Path:**
1. `components/Member.tsx` `parqCallout()` (components/Member.tsx:242-259) — renders the alert; its action button sets `parqOpen = true`, which mounts `<ParqForm open onCleared={onParqCleared} onReferral={setReferral}>` (components/Member.tsx:890-896) →
2. `components/ParqForm.tsx` `ParqForm()` (components/ParqForm.tsx:45-183) — seven-question radio form; tracks `answers` locally; "Submit screening" calls `submit()` →
3. `components/ParqForm.tsx` `submit()` (components/ParqForm.tsx:80-104) — calls `api('POST', '/members/:memberId/parq/submit', { answers, note }, 'MEMBER')` →
4. `lib/store.ts` `api()` (lib/store.ts:32-50) — does the actual `fetch('/api' + path, ...)`, records the round-trip into the in-memory `calls` array (visible later in the API activity panel), returns the parsed JSON or throws on non-2xx →
5. `app/api/[...path]/route.ts` `handle()`, branch `seg[2]==='parq' && seg[3]==='submit'` (app/api/[...path]/route.ts:188-208) — checks each `PARQ_QUESTIONS` entry's `redFlag` against the submitted answers (`lib/reference.ts:53-61` for the question list). If any red-flag question was answered "yes": inserts a `flags` row with a physician-referral message (once, deduped by text match) and sets `members.parqCleared = false`, returning `{cleared:false, referral:true, message}`. Otherwise sets `parqCleared = true`, deletes any existing PAR-Q-related `flags` rows, returns `{cleared:true}` →
6. Back in `ParqForm.tsx` `submit()` (components/ParqForm.tsx:90-97) — on `r.cleared`, calls the `onCleared` prop; on a referral, calls `onReferral(r.message)` and scrolls the dialog to show it →
7. `components/Member.tsx` `onParqCleared()` (components/Member.tsx:233-238) — closes the dialog, toasts "Screening complete — you can book now", and calls `refresh('MEMBER')` (the `useSnapshot` hook's refetch — see the Snapshot polling flow below), which re-fetches `GET /snapshot?scope=member&id=...` so `me.parqCleared` reflects the new state everywhere in the UI (the booking button's `disabled={!me.parqCleared}` check on components/Member.tsx:790 unlocks immediately after).

A dev-only bypass exists at `components/ParqForm.tsx` `override()` (components/ParqForm.tsx:68-78) — calls `POST /members/:id/parq {cleared:true}` directly, compiled out via a `process.env.NODE_ENV !== 'production'` check around its button (components/ParqForm.tsx:172-176). Same underlying route as the coach/admin "Mark PAR-Q cleared" action described below.

**Currently modifying:** n/a — retroactive trace

---

## Coach manual ROM entry → assessment → scoring

**Entry point:** Coach console member drawer, "Save assessment" button (`components/Coach.tsx`'s `renderDrawer()`).

**Path:**
1. `components/Coach.tsx` `renderDrawer()` (components/Coach.tsx:435-650) — on drawer open, a `useEffect` (components/Coach.tsx:90-104) seeds the `rom` state object with the member's current measurements (or 60% of each muscle's target if none exist yet) via `MUSCLES` (lib/reference.ts:8-19); each muscle renders as a `TextField` bound to `rom[mu.key]` →
2. "Save assessment" button `onClick` (components/Coach.tsx:525-528) — calls `api('POST', '/members/:id/assessments', { coachId, measurements: MUSCLES.map(...) }, 'COACH')` →
3. `lib/store.ts` `api()` (lib/store.ts:32-50) — same as above →
4. `app/api/[...path]/route.ts` `handle()`, branch `seg[2]==='assessments'` (app/api/[...path]/route.ts:275-282) — calls `fromManualEntry(body.measurements)` →
5. `lib/adapters/bodymap.ts` `fromManualEntry()` (lib/adapters/bodymap.ts:57-59) — calls internal `coerce()` (lib/adapters/bodymap.ts:36-44), which drops any unrecognised muscle key and clamps each value to `[0, target]`, returning `NormalisedMeasurement[]` tagged `source: 'manual'` →
6. Back in `route.ts` (app/api/[...path]/route.ts:278-280) — inserts one `assessments` row (`source: 'manual'`) and one `measurements` row per normalised entry, then calls `refreshScoreDay(seg[1])` →
7. `app/api/[...path]/route.ts` `refreshScoreDay()` (app/api/[...path]/route.ts:112-128) — re-reads the member's latest measurements, program adherence, and most recent session RPE, calls `computeScores()`, deletes and re-inserts today's `scoreDays` row →
8. `lib/scoring.ts` `computeScores()` (lib/scoring.ts:63-75) — calls `flexibilityScore()` (lib/scoring.ts:20-24), `mobilityScore()` (lib/scoring.ts:30-38, weighted toward hip flexors/thoracic/shoulders/calves), and `recoveryScore()` (lib/scoring.ts:48-61) →
9. Back in `Coach.tsx` `act()` (components/Coach.tsx:119-122) — toasts "Assessment saved — member view updated" and calls `refresh()`, which re-polls the coach's scoped snapshot so the drawer's Gonio dials and the member's own view (on their next poll) reflect the new scores.

**Currently modifying:** n/a — retroactive trace

---

## BodyMap simulated device import → scoring

**Entry point:** Coach console member drawer, "Import from BodyMap" button (also present in the Admin member drawer).

**Path:**
1. `components/Coach.tsx` "Import from BodyMap" `onClick` (components/Coach.tsx:529-531) — calls `api('POST', '/integrations/bodymap/import', { memberId, coachId }, 'COACH')` →
2. `app/api/[...path]/route.ts` `handle()`, branch `p === 'integrations/bodymap/import'` (app/api/[...path]/route.ts:265-273) — fetches the member's previous measurements via `latestMeasurements()` (app/api/[...path]/route.ts:103-109), then calls `simulateDeviceRead(prev)` →
3. `lib/adapters/bodymap.ts` `simulateDeviceRead()` (lib/adapters/bodymap.ts:66-76) — demo-only function, explicitly marked "Delete this the day a real adapter works"; nudges each muscle 1-5° up from its previous reading (or 60% of target if none), tags the result `source: 'bodymap'`, `deviceId: 'BM-DXB-002'` →
4. Back in `route.ts` (app/api/[...path]/route.ts:269-271) — inserts an `assessments` row (`source: 'bodymap'`) and its `measurements` rows, then calls `refreshScoreDay(body.memberId)` — same scoring path as steps 7-8 in the manual-entry flow above →
5. `Coach.tsx` `act()` (components/Coach.tsx:119-122) — toasts "BodyMap reading ingested" and refreshes the snapshot.

The two stub adapters that a real device integration would use instead of step 3 — `fromDeviceApi()` and `fromExportFile()` (lib/adapters/bodymap.ts:47-54) — both `throw` immediately; nothing currently calls them.

**Currently modifying:** n/a — retroactive trace

---

## Session logging (coach) → scores, credits, streak

**Entry point:** Coach console member drawer, "Log session" button (also present in the Admin member drawer, same shape).

**Path:**
1. `components/Coach.tsx` "Log session" `onClick` (components/Coach.tsx:592-594) — reads the `sform` state (modalities, mins, RPE, pain before/after, coach notes, member summary — all bound to controls at components/Coach.tsx:538-589), calls `api('POST', '/sessions', { memberId, coachId, bookingId, ...sform }, 'COACH')` with `close=true` so the drawer shuts on success →
2. `app/api/[...path]/route.ts` `handle()`, branch `p === 'sessions'` (app/api/[...path]/route.ts:285-300) — validates `memberSummary` is non-empty (422 if not), inserts a `sessions` row, marks the linked `bookings` row `completed` if a `bookingId` was passed, decrements `members.credits` (floor 0) and increments `members.streak`, then calls `refreshScoreDay(m.id)` →
3. `refreshScoreDay()` (app/api/[...path]/route.ts:112-128) → `computeScores()` (lib/scoring.ts:63-75) — same scoring path as the assessment flows above, but now `recentRpe` in `recoveryScore()`'s input reflects the RPE just logged →
4. `Coach.tsx` `act(..., 'Session logged — summary sent to member', true)` (components/Coach.tsx:119-122, 592-594) — toasts, closes the drawer, refreshes the scoped snapshot. On the member's side, `components/Member.tsx`'s `renderProgress()` history tab (components/Member.tsx:611-631) picks up the new row on its next poll, surfacing `x.memberSummary` — the coach-written, member-facing text — not `coachNotes`, which stays internal-only in the API response and is never rendered in `Member.tsx`.

**Currently modifying:** n/a — retroactive trace

---

## Booking: request → confirm / decline

**Entry point:** Member "Book a session" flow (`components/Member.tsx`'s `renderBook()`) for the request; Coach "Today" or "Requests" tab for confirm/decline.

**Path (member requests, any studio — `docs/adr/0018`):**
1. `components/Member.tsx` `renderBookPicker()` — a Studio `ToggleButtonGroup` (`SITES`, new) picked first, defaulting to the member's own site; service/date/time/add-on picker below it; a `useEffect` fetches `GET /availability?date=...&serviceId=...&siteId=...` as the studio/date/service selection changes →
2. `app/api/[...path]/route.ts` `handle()`, branch `p === 'availability'` → `slotsFor(date, serviceId, siteId)` — `siteId` now scopes the busy-time grid to one studio (previously all three studios shared one grid, so a booking at Marina could block a slot at Business Bay — a real bug this change fixed as a side effect) →
3. "Request session" button calls `components/Member.tsx` `book()` — `api('POST', '/bookings', {...draft, siteId}, 'MEMBER')` →
4. `app/api/[...path]/route.ts` `handle()`, branch `p === 'bookings'` — 404s if the member doesn't exist, **409s if `parqCleared` is false** (this is the server-side enforcement point for the PAR-Q gate on booking), validates `body.siteId` against `SITES` (falling back to the member's own site if omitted), re-checks the slot isn't already taken *at that site*, inserts a `bookings` row with `status: 'requested'` and `siteId` (the chosen studio, not always the member's own) →
5. Back in `Member.tsx` `book()` — toasts the returned message, switches back to the Today tab, refreshes the snapshot.

**Path (studio manager confirms/declines — the sole approval path, `docs/adr/0008`):**
1. `components/Manager.tsx`'s `ApproveAction` (Requests tab) — picks a coach, calls `api('POST', '/bookings/:id/confirm', {coachId}, 'MANAGER')` or `api('POST', '/bookings/:id/decline', {reason}, 'MANAGER')` →
2. `app/api/[...path]/route.ts` `handle()`, branches `seg[2]==='confirm'` / `seg[2]==='decline'` — updates `bookings.status` to `'confirmed'`/`'cancelled'`, returns `{..., notified:['push','whatsapp']}` (simulated — no real notification is sent; see `prototype/decisions.md`'s note on the Notifications deviation) →
3. `Manager.tsx` `act()` — toasts and refreshes; the member sees the status change on their next poll (`components/Member.tsx`'s `renderToday()`/`renderBookingsList()` read `myBookings` off the same snapshot).

**Coach's own Today/Requests tabs are read-only as of 2026-08-19** (product owner batch review — see `prototype/decisions.md`): `components/Coach.tsx` renders an "Awaiting studio manager approval" chip in place of the Confirm/Decline buttons that used to call the same two endpoints above. The endpoints themselves are unchanged and still shared with the manager's path (docs/architecture/overview.md's existing note that "a manager and a coach approve through the identical write path" is now half-true — the write path is still shared, but only the manager's UI calls it; this is a UI-layer fix, not a server-side role check, consistent with `docs/adr/0002`'s "not a real security boundary" framing for this whole tree.

Cancellation (member-initiated) follows the same shape: `Member.tsx`'s cancel buttons (components/Member.tsx:326, 666) call `api('DELETE', '/bookings/:id', ...)` → `app/api/[...path]/route.ts:259-262`, which sets `status: 'cancelled'`.

**Currently modifying:** n/a — retroactive trace

---

## Snapshot polling (the live-data backbone every other flow refreshes through)

**Entry point:** Any of `Gate`, `Member`, `Coach`, `Admin` mounting.

**Path:**
1. `components/{Gate,Member,Coach,Admin}.tsx` — each calls `useSnapshot()` with no scope (Gate, Admin) or `{kind, id}` (Member, Coach) →
2. `lib/store.ts` `useSnapshot()` (lib/store.ts:59-82) — on mount, calls `refresh('SYSTEM')`; sets a `setInterval` (default 12s, or the caller's `pollMs`) that calls `refresh('SYSTEM', silent=true)` whenever `document.visibilityState === 'visible'` →
3. `lib/store.ts` `refresh()` (lib/store.ts:64-71) — silent polls hit `fetch('/api/snapshot'+qs)` directly (bypassing `api()`, so they don't spam the API activity log); the initial load goes through `api('GET', '/snapshot'+qs, ...)` (lib/store.ts:32-50) so it does show up there →
4. `app/api/[...path]/route.ts` `handle()`, branch `p === 'snapshot'` (app/api/[...path]/route.ts:136-140) → `snapshot()` (app/api/[...path]/route.ts:67-88) — fetches every table in parallel via `membersWithScores()` (app/api/[...path]/route.ts:27-59, which itself computes each member's current `scores` via `computeScores()`) plus `coaches`/`bookings`/`sessions`/`programs`/`checkins`/`scoreDays`/`assessments`/`measurements`, and the static `reference` block (`MUSCLES`/`SERVICES`/`ADDONS`/`PARQ_QUESTIONS`) →
5. If `scope.kind==='coach'`, applies `scopeSnapshotForCoach()` (lib/reference.ts:86-110); if `'member'`, applies `scopeSnapshotForMember()` (lib/reference.ts:118-131) — both server-side, trimming the payload before it goes over the wire (not a security boundary — see `prototype/decisions.md`) →
6. Response lands back in the calling component's `snap`/`data` state, re-rendering whatever tab/view is open. Because every mutation flow above ends by calling the same component's `refresh()`, this polling loop is also how a coach's session log becomes visible on the member's screen, and vice versa, without a websocket or push channel.

Coach console applies an *additional* client-side scoping pass on top of step 5's server-side one: `components/Coach.tsx` (components/Coach.tsx:78) calls `scopeSnapshotForCoach(rawSnap, coachId)` again on the already-server-scoped response — redundant in the current single-scope-value setup, but is what actually drives what `Coach.tsx` renders.

**Currently modifying:** n/a — retroactive trace

---

## Admin / studio-wide data views

**Entry point:** `GET /admin` (`app/admin/page.tsx`) → `components/Admin.tsx`.

**Path:**
1. `components/Admin.tsx` `Admin()` (components/Admin.tsx:61-485) — calls `useSnapshot()` with **no scope** (components/Admin.tsx:62), the only surface besides the Gate persona picker that requests the full unscoped snapshot — see the Snapshot polling flow above →
2. `renderOverview()` (components/Admin.tsx:125-188) — `coachOutcomes()` (components/Admin.tsx:114-121) derives per-coach session count / avg RPE / avg pain-drop straight from the `sessions` array in the snapshot (no separate outcomes table); `utilisation()` (components/Admin.tsx:83-88) derives booked-minutes-as-percent-of-capacity straight from `bookings` — both are read-time aggregations, not stored metrics →
3. `renderEarnings()` (components/Admin.tsx:190-259) — sums `bookings.aed` by day/service for the selected date range; explicitly labeled "booked revenue... not a ledger" in its own copy, because there's no credit-ledger or transaction-log table behind it (see `docs/architecture/overview.md`'s Credits & payments deviation) →
4. `renderMembers()` / `renderRoster()` (components/Admin.tsx:294-327, 261-292) — full unscoped member/coach tables, each row opening `renderDrawer()` (components/Admin.tsx:329-464) — a near-duplicate of `Coach.tsx`'s member drawer (manual assessment entry, BodyMap import, session logging, programme prescription, all following the same flows documented above, just fired with `coachId: snap.coaches[0]?.id` instead of the logged-in coach's own id, since Admin has no coach identity of its own).

Contrast with the Coach console: `Coach.tsx` never sees this unscoped data — it always renders from the doubly-scoped `snap` described in the Snapshot polling flow, and the coach-outcomes/capacity content that used to live there was moved here (see `prototype/decisions.md`).

**Currently modifying:** n/a — retroactive trace

---

## Debug tooling: API activity panel and Database rows panel

**Entry point:** Settings menu (⋮) on any Chrome-wrapped route, admin-only per `Chrome.tsx`; also reachable pre-login from the Gate page's own ⋮ menu.

**Path (API activity):**
1. `components/Chrome.tsx` / `components/Gate.tsx` menu item "API activity" — sets `dock='api'`, mounting `<ApiPanel onClose>` →
2. `components/Panels.tsx` `ApiPanel()` (components/Panels.tsx:9-38) — subscribes to the module-level `calls` array via `useSyncExternalStore(subscribeCalls, getCalls, getCallsServer)` (lib/store.ts:8-30) →
3. Every `api()` call anywhere in the app (lib/store.ts:32-50) pushes a `Call` record (`who`, `verb`, `path`, `req`, `res`, `status`, `ms`, `at`) onto that array and calls `emit()`, which is what makes every flow documented above show up live in this panel as it happens — nothing here is synthesized separately from the real HTTP round-trips.

**Path (Database rows):**
1. Menu item "Database rows" — mounts `<DataPanel onClose>` →
2. `components/Panels.tsx` `DataPanel()` (components/Panels.tsx:40-90) — on mount and every 8s, calls `load()` (components/Panels.tsx:46-49) → `api('GET', '/admin/tables', ...)` →
3. `app/api/[...path]/route.ts` `handle()`, branch `p === 'admin/tables'` (app/api/[...path]/route.ts:323-337) — reads every table directly (measurements/score_days capped at 200/100 rows), returns `{tables, counts}` →
4. `DataPanel` renders whichever table tab is selected as a plain HTML table, capped at 60 visible rows.

**Currently modifying:** n/a — retroactive trace

---

## Demo data reset

**Entry point:** Settings menu → "Reset demo data" (available from `Gate.tsx` pre-login and `Chrome.tsx` on any authenticated route).

**Path:**
1. `components/Gate.tsx` menu item (components/Gate.tsx:75-81) or `components/Chrome.tsx` `resetDemo()` (components/Chrome.tsx:55-58) — calls `api('POST', '/admin/seed', {}, 'SYSTEM')` →
2. `app/api/[...path]/route.ts` `handle()`, branch `p === 'admin/seed'` (app/api/[...path]/route.ts:339) — calls `seed()` →
3. `db/seed.ts` `seed()` (db/seed.ts:57-181) — `wipe()`s every table (db/seed.ts:51-55), then re-inserts the three fixed personas (Layla/power, Amira/active, Tom/new — the empty state), their assessment history (`laylaCurve`/`amiraCurve` shaping the progress-chart story), 48+2 sessions, programmes, bookings, and a 90/60-day `scoreDays` series per member via `computeScores()` (lib/scoring.ts:63-75) →
4. Back in `Chrome.tsx` `resetDemo()` — calls `switchAccount()` (components/Chrome.tsx:49-53), which clears the session cookie and routes to `/`, landing back on the Gate with the freshly-seeded personas.

The same `seed()` function is invoked directly, outside the HTTP path, by `npm run db:seed` (`prototype/package.json`'s script), via the `if (process.argv[1]...)` guard at the bottom of `db/seed.ts` (db/seed.ts:184-187).

**Currently modifying:** n/a — retroactive trace
