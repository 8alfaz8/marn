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

Both `app/coach/page.tsx` and `app/studio/page.tsx` repeat the same
`getStaffSession()` + role-mismatch redirect at the top of the route,
not just here — this is the front door, not the only lock (every
`lib/actions/*.ts` function re-authorizes independently underneath it).

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
