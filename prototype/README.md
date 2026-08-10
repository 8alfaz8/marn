# Marn — prototype

Assisted stretching and recovery, tracked in degrees. One Next.js app serving two surfaces:

- **Member** — mobile-first web. Scores, body map, progress, booking, home programme.
- **Coach console** — desktop and tablet. Floor schedule, roster, requests, assessment capture, session logging.

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
npm run db:seed               # load the three personas
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

1. Open as **Layla Mansour** (power user). Look at Progress — ninety days of history, an early climb,
   a plateau around month four, then a second climb. That shape is the pitch.
2. Open as **Tom Whitfield**. Everything is empty and booking is blocked until his readiness screening
   is done. Most people's day one looks like this.
3. **Create an account** from the gate. You are now a real row in Postgres.
4. Book a session as any member.
5. Switch to **Coach** → Requests → confirm it. Assign yourself.
6. Coach → Members → open the member → **Import from BodyMap** → fill in the session form → **Log session**.
7. Switch back to the member. Scores moved, the body map recoloured, and the coach's summary is in Progress.
8. **Settings → API activity** shows every request that did it. **Settings → Database rows** shows the rows.

---

## What's real and what isn't

Real: Postgres persistence, the full API surface, scoring maths, PAR-Q gating, credit decrement,
booking conflict detection, coach and member creation.

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
app/page.tsx              root: persona gate, role switch, settings
app/api/[...path]/        the entire API surface, one dispatcher
components/Member.tsx     member surfaces
components/Coach.tsx      coach console and member drawer
components/Viz.tsx        goniometer arc, area chart, body map
components/Panels.tsx     API log and database browser
db/schema.ts              canonical data model
db/seed.ts                the three personas
lib/scoring.ts            composite scores — isolated, will be rewritten
lib/adapters/bodymap.ts   anti-corruption layer for the device
lib/reference.ts          muscles, services, prices
```

## Commands

| | |
|---|---|
| `npm run dev` | local dev server |
| `npm run db:push` | apply schema changes |
| `npm run db:seed` | wipe and re-seed personas |
| `npm run db:studio` | Drizzle Studio, browse tables locally |

Resetting from the deployed app: **Settings → Reset demo data**.
