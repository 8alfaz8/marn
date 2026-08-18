# Marn — prototype

Assisted stretching and recovery, tracked in degrees. One Next.js app serving four surfaces,
across three studios:

- **Member** — mobile-first web. Scores, body map, progress, booking, home programme.
- **Coach console** — desktop and tablet. Requests, assessment capture, session logging.
- **Studio manager console** — desktop and tablet. Floor view, shift assignment, manual booking,
  request approval, site roster.
- **Platform admin** — cross-studio overview, site-filterable roster, earnings.

Both read and write the same Postgres database. What a coach saves, a member sees on refresh.

---

## Deploy in about fifteen minutes

### 1. Database — Neon

1. Create a free account at [neon.com](https://neon.com) and a project called `marn`.
2. Open **Connect** and copy the **pooled** connection string — it has `-pooler` in the hostname.
   The unpooled one will exhaust connections the moment more than one person clicks around.
3. Free tier: 0.5 GB storage, no card, no expiry, commercial use allowed. Compute sleeps after five
   minutes idle and wakes in about a second. **Data is never deleted while idle** — a member created
   today is still there next week.

### 2. Local

```bash
npm install
cp .env.example .env          # paste your pooled DATABASE_URL
npm run db:push               # create the tables
npm run db:seed               # load three studios' worth of demo people ("Test User (###)")
npm run dev                   # http://localhost:3000
```

### 3. GitHub

```bash
git init && git add -A
git commit -m "Marn prototype"
git branch -M main
git remote add origin git@github.com:YOUR_USER/marn.git
git push -u origin main
```

### 4. Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
2. Framework auto-detects as Next.js. Add one environment variable:
   `DATABASE_URL` = your pooled Neon string. Tick all three environments.
3. Deploy. You get a public URL.
4. If the tables aren't there yet, run `npm run db:push && npm run db:seed` locally against the
   same `DATABASE_URL` — it's the same database.

Redeploys are automatic on every push to `main`.

---

## Walking the demo

Every seeded person is named `Test User (###)` — search the landing page's Autocomplete by number.
Members split three ways per studio: 8 brand-new (empty state, PAR-Q outstanding), 32 "active"
(weeks to months in, steady history), 10 "power" (longest tenure, wearable-linked, dense history).

1. Sign in as a **User** (member) from a long-tenured number (higher numbers within a studio's 50
   skew toward "power"). Look at Progress — a real flexibility-score trend line, since-you-joined or
   twelve-week window depending on tenure.
2. Sign in as one of the first few numbers at a studio instead — everything is empty and booking is
   blocked until the PAR-Q is done. Most people's day one looks like this.
3. **Create an account** from the gate, picking a studio. You are now a real row in Postgres.
4. Book a session as any member.
5. Use the top-bar switcher to jump to a **Studio manager** at the same studio → Requests → assign a
   coach → Confirm. Or Floor → book a walk-in directly, using the shift-aware time-slot picker.
6. Switch to **Coach** → Members → open the member → **Import from BodyMap** → fill in the session
   form → **Log session**.
7. Switch back to the member. Scores moved, the body map recoloured, and the coach's summary is in Progress.
8. Sign in as **Platform admin** → toggle between "All studios" and one studio → the roster and stats
   re-scope.
9. **Settings → API activity** shows every request that did it. **Settings → Database rows** shows the rows.

---

## What's real and what isn't

Real: Postgres persistence, the full API surface, scoring maths, PAR-Q gating, credit decrement,
booking conflict detection, shift-and-overlap-aware manual booking, coach/manager/member creation.

Not real, deliberately:

- **Auth.** Anyone can open any account. Fine for a demo; a blocker for anything else.
- **BodyMap.** `lib/adapters/bodymap.ts` has three adapters. Only the simulator is implemented,
  because we don't have the vendor's contract yet. The other two have their signatures fixed so
  call sites won't move when the device arrives.
- **Payments.** Prices are computed, nothing is charged.
- **Offline capture.** Needed before the first container pod at a sports facility; not before then.
- **Arabic.** Copy is English. Nothing is hard-coded in a way that blocks an RTL pass later.

## Do not put real member data in this

This deployment sits outside the UAE. UAE Federal Law No. 2 of 2019 restricts storing or processing
health data generated in the UAE outside the country. Range-of-motion readings and pain scores are
health data. Seed and demo records only — the first real member goes in a UAE-hosted environment.

The codebase is built so that move is cheap: plain Postgres over a connection string, no Neon or
Vercel proprietary APIs, `output: 'standalone'` so it runs in a container. Changing hosts is a change
of `DATABASE_URL` and a Dockerfile.

## Layout

```
app/page.tsx              root: category/person gate, settings
app/api/[...path]/        the entire API surface, one dispatcher (includes /directory)
components/Gate.tsx       landing page: category toggle, site filter, search, admin entry
components/Chrome.tsx     shared app bar: role switch + cross-studio person switcher
components/Member.tsx     member surfaces
components/Coach.tsx      coach console and member drawer
components/Manager.tsx    studio manager console: floor, requests, staff, members
components/DayTimeline.tsx, components/TimeSlotPicker.tsx   floor-view building blocks
components/Viz.tsx        goniometer arc, area chart, body map
components/Panels.tsx     API log and database browser
db/schema.ts              canonical data model
db/seed.ts                three studios' worth of demo people and their history
lib/scoring.ts            composite scores — isolated, will be rewritten
lib/scheduling.ts         shift/overlap math — pure, no DB, ported from the root product
lib/adapters/bodymap.ts   anti-corruption layer for the device
lib/reference.ts          muscles, services, prices, studios
```

## Commands

| | |
|---|---|
| `npm run dev` | local dev server |
| `npm run db:push` | apply schema changes |
| `npm run db:seed` | wipe and re-seed personas |
| `npm run db:studio` | Drizzle Studio, browse tables locally |

Resetting from the deployed app: **Settings → Reset demo data**.
