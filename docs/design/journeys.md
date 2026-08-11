---
status: "grounded in the three seed personas in db/seed.ts, not generic user types"
---

# Journeys — member and coach

Each step is marked **[built]** where the prototype actually does this today,
or **[blueprint only]** where it's described in `docs/blueprint/marn-blueprint.md`
but nothing in the code does it yet. Where a step behaves differently from
the blueprint's description, that's called out inline, not hidden.

---

## The member journey

Told through the three seed personas (`db/seed.ts`), because they sit at three
different points on the blueprint's "member's year" arc (§3.1) and the
prototype's UI genuinely looks different for each of them.

### Tom Whitfield — day one, the empty state

Tom exists to prove the app doesn't fall apart with nothing in it (the seed
file's own comment: "this is the empty state, and it is the one people forget
to design").

1. Opens the Gate, picks "Create an account," types name/phone/goal. **[built]** — this used to be the exact bug where the form lost keyboard focus after one character; fixed by making the Gate a real route instead of a component redefined on every render.
2. Lands on `/member`, Today tab. Sees "No assessment yet — your numbers start at your first session," not a blank screen or an error. **[built]**
3. Sees a warning that his readiness screening is outstanding, with a "Start screening" button. **[built]** — but self-service: he answers seven questions himself in a dialog and the system clears him immediately if nothing red-flags. The blueprint describes this as something "completed with a coach" at the first visit and cleared by "a named person" (§1.5); this prototype deliberately does it differently — see `docs/adr/0001-parq-self-service.md`.
4. If he answers a red-flag question ("has a doctor ever advised you not to exercise?") honestly, he does **not** get cleared — he sees a persistent warning to see a physician first, and the booking button stays disabled. **[built]** — this is the one non-negotiable part of the exception: the referral gate still holds even though the clearing mechanism changed.
5. Once cleared, goes to Book, picks Assisted Stretch, a date, a time slot, requests it. The booking lands as `requested` with no coach assigned yet — it sits in every coach's Requests inbox until one of them claims it. **[built]**
6. His obvious next step: wait for a confirmation. What he'd expect next — a WhatsApp or push message — doesn't actually send; the API returns a `notified` field claiming it did, but no integration exists. **[blueprint only]** (§9.3)
7. He has no body map, no progress chart with data, no session history, no home programme yet — correctly, since nothing has happened to him yet. The first coach session is what starts all four.

### Amira Khalid — four months in, one open safety flag

Amira is the mid-journey member: real data, a real constraint a coach needs
to see before touching her.

1. Opens as Amira from the Gate ("Four months in. Steady progress, one open safety flag."). **[built]**
2. Today tab shows real numbers: a flexibility score with a 7-day delta, mobility and recovery rows, her streak. **[built]**
3. Her nearest booking (an unassigned `requested` slot today, ahead of a `confirmed` one tomorrow — the UI always surfaces whichever is soonest) shows with a status chip and a "Pre-session check-in" button. **[built]** — but that button sends a fixed, hardcoded check-in payload (`sleep: 3, pain: 5, "shoulder stiff"`), not the two-tap body-diagram form the blueprint describes (§4.1.7). The `checkins` table and the coach-side view of it are both real; only the member-side capture form isn't built.
4. "Priority areas today" lists her three tightest muscle groups; tapping one jumps to the Body tab with that region pre-selected on the correct front/back face. **[built]**
5. Body tab shows a curved, shaped anatomical figure (not the flat rectangles the prototype used to have) colored by how close each group is to its target arc. **[built]**
6. **Gap worth knowing about:** her safety flag — "right shoulder impingement, avoid end-range overhead loading" — is never shown to Amira anywhere in the member UI. It's visible to her coach and to admin, but the member surface never reads `me.flags`. Not something either the blueprint or a recent request asked to fix; noted here because a journey doc that skips it would be misleading.
7. Home tab shows her prescribed programme with completions logged so far, and a "Mark today complete" action that's idempotent per day. **[built]**
8. Obvious next step: attend the booked session, where the coach's summary becomes the next thing she reads in Session history.

### Layla Mansour — nine months in, the graph has a story

Layla is what "month six" (§3.1) looks like: a member who doesn't need
convincing anymore.

1. Opens as Layla ("Nine months in. 48 sessions, wearable linked, 41-day streak. The graph has a story in it."). **[built]**
2. Today tab: large flexibility readout, a 41-day streak badge, Whoop already shown as connected (checked and disabled — there's no disconnect action). **[built]**
3. Progress tab: a 90-day line chart that visibly climbs, plateaus, and climbs again — the seed data was deliberately shaped this way to demonstrate the blueprint's "trend over value" presentation rule (§5.4) with something other than a straight line. **[built]** — this is the clearest place in the prototype where a blueprint design principle and the actual pixels agree.
4. Session history: 48 real entries, alternating 30/60-minute sessions, each with the coach's plain-language summary. **[built]**
5. Her connected wearable doesn't sharpen anything yet — `hasWearable` in the scoring function is a flat +8 bonus, exactly as the blueprint names it as a placeholder for real HRV/sleep data (§5.4). **[built as documented placeholder]**, not a bug.
6. What Layla's journey doesn't have: a milestone badge for her streak, a friend she's added, a referral card to share. **[blueprint only]** (§4.1.4, §4.1.5 — neither community nor milestones exist in the schema yet.)

---

## The coach journey

Told through Sara Haddad (`c1`, Lead Flexologist), against Tom's and Amira's
seed data, following the shape CLAUDE.md itself specifies: day view → member
context before they walk in → capture during session → notes and flags → hand
off.

1. Opens as staff from the Gate, lands on `/coach`. Sees "Your floor today" — booked count, confirmed count, awaiting-reply count, open flags — but scoped to her own bookings and the shared unassigned inbox, not the whole studio's. **[built]** — this scoping is client-side only today (`lib/reference.ts`'s `scopeSnapshotForCoach`); a coach with browser dev tools open could still see the raw `/api/snapshot` response. See `docs/adr/0002-prototype-auth-gap.md`.
2. Schedule table shows today's bookings in scope; a member with an open flag shows a small flag indicator inline, before Sara opens their record. **[built]** — matches the blueprint's "safety flags... shown before the coach touches them" requirement (§3.2) directly.
3. Attention panel lists open flags for members in her scope — Amira's shoulder note would appear here, since Amira has sessions attributed to Sara in the seed data. **[built]**
4. Requests tab: Amira's unassigned booking sits here alongside any other pending request. Sara can confirm or decline; confirming assigns her as the coach. **[built]** — there's no "reassign" action for an already-confirmed booking; only decline, then it re-enters as unassigned.
5. Opens a member's record (say, Tom's, once he's booked and a coach has claimed him). Sees no assessment on record, and two ways to capture one: "Import from BodyMap" (a simulated device read, since the real device's API contract is still unknown) or ten manual range-of-motion fields. **[built, both paths]**
6. Saves the assessment; scores recompute immediately and the member's own app updates on its next poll — "the member's app updates while they are still in the building" (§3.2) is real, not aspirational, in this prototype. **[built]**
7. Logs the session: modalities used, duration, RPE, pain before/after, an internal note, and a member-facing summary. The summary field is required — the API rejects a session without one (422), exactly as specified (§4.2.4). **[built]**
8. Can clear a flag (Amira's shoulder note, or Tom's PAR-Q flag if he never completes the self-service form himself) directly from the record. **[built]**
9. What Sara's console does *not* show, by deliberate choice made after the blueprint was written: coach outcome metrics, revenue, and studio-wide capacity — all pulled out of the coach console and moved to the separate Administration surface, because the product owner didn't want coaches seeing the business side of the studio. This is narrower than the blueprint's own Phase 3 intent, which has coaches seeing *their own* outcome numbers as a coaching tool (§4.2.7) — currently they see none of it.
10. Obvious next step for Sara: the next name on the schedule. Nothing in the console blocks on a modal or a slow save — matches the "if the console is slower than a paper notebook, coaches will use the notebook" design constraint (§3.2), though this hasn't been timed against a real coach yet (§14.6's own risk register item — "watch a coach use it in person before believing any of it works" — still open).

---

## Root product — readiness screening and the member portal (2026-08-11)

Everything above is the prototype. The root product (`docs/architecture/overview.md`'s
"Root product status" table) now covers Phase 1's remaining two journey
steps at the coach and member surfaces, coach-administered rather than
self-service (`docs/adr/0001` was a prototype-only exception):

1. A coach opens a member's context panel and taps "Start screening." Seven
   PAR-Q-derived questions, checkboxes, an optional note. **[built]** — a
   clean screening clears the member (chip flips, booking unblocks
   immediately); a red-flag answer shows a persistent referral banner with
   no in-app way to clear it, and the studio manager's booking form refuses
   that member with a plain error until a clean re-screening.
2. A studio manager opens that same member's detail drawer and generates a
   "progress link" — a plain URL, no password. **[built]** — copies to the
   clipboard automatically; generating again invalidates the previous link.
3. The member opens the link on their own phone: their current Flexibility/
   Mobility/Recovery scores (from their latest assessment), priority areas,
   a region-grouped range list standing in for a full body map this pass,
   and their session history with each coach's plain-language summary.
   **[built]**, read-only, no sign-in. A revoked or mistyped link shows a
   plain "this link isn't valid" state, not an error page.
4. **Not yet built at root:** progress-over-time (a single latest snapshot
   only, no trend line — no chart dependency added this pass), and Recovery
   is real for effort but not for adherence or streak (no home-programme
   data source exists yet, blueprint Phase 2). See
   `docs/architecture/overview.md`'s root deviations for the full list.
5. **Browser-verified**, step by step, via Playwright against a throwaway
   account (see `docs/decisions.md`'s 2026-08-11 entry) — including catching
   and fixing a real onboarding deadlock (a coach couldn't reach a
   first-time, unscreened member at all) that a build/type-check pass alone
   would never have surfaced.
