# MARN

## Technical and Product Blueprint

**Version 0.1 · August 2026 · Dubai, UAE**

---

### How to read this

This document has two audiences and does not apologise for either.

An investor should be able to read Parts One and Two and understand what the business is, why it is
defensible, and what the money buys. An engineer — or a coding agent working from this file — should
be able to read Parts Three through Six and build the thing without asking a question that isn't
already flagged as open.

Where the two audiences want different things, the engineering detail wins and the prose carries the
argument around it. Anything genuinely undecided is marked **OPEN** rather than papered over. A
blueprint that pretends to certainty it doesn't have is worse than no blueprint, because it hides the
places where the plan will bend.

**Name.** Marn — from *مرن*, Arabic for supple or flexible. Short, ownable, works in both scripts.
Trademark clearance is outstanding and is the first item on the legal checklist.

---

# PART ONE — THE BUSINESS

---

## 1. Executive summary

### 1.1 The one-sentence version

Marn is a companion app for physical rehab and pain relief: assisted stretching and physical recovery
delivered one-to-one in studios, tracked in an app a member opens every day, so the relief they feel is
backed by a number they can watch move over months.

### 1.2 Why the framing matters

There is an obvious version of this business and a better one.

The obvious version is a stretch studio members visit when something hurts, with a booking app bolted
on. Hire flexologists, fit out a unit in a mall, sell packages. It works, it is being done, and it has
no defensible position: anyone with capital can buy the same beds and hire from the same pool. The app
is a booking form. Competition is on location and price, and price competition in a service business
with fixed labour costs ends badly.

The better version inverts it. **Pain relief and physical rehab are what a member is buying; the app is
where they live with it, and the studio is where the physical work happens.** A member opens the app
between visits, not just to book — to see what hurt before and after, whether it's actually easing, and
what to do at home. Every member has a longitudinal record behind that experience — ten joint angles in
degrees, captured every six to eight sessions, tied to what was worked and how they slept — and that
record is what turns "I feel a bit better" into something a member can see and trust. Nobody in this
market gives a member that. It is the reason members stay past month three, the reason a corporate buyer
signs, and the thing an acquirer is actually buying.

The practical consequence for engineering: **the app a member returns to is the core system, and the
assessment pipeline behind it is what makes its pain-relief claims trustworthy rather than anecdotal.
Booking and payments are commodity plumbing to be built as thinly as possible and never lovingly.**

### 1.3 What we are building

Three surfaces on one backend.

| Surface | Who | Where |
|---|---|---|
| Member app | Paying members | iOS, Android, mobile web |
| Coach console | Flexologists | Tablet at the bed, laptop at the desk |
| Studio manager console | Studio managers | Laptop at the desk, tablet on the floor |
| Corporate portal | Employer accounts | Desktop web |

> Coach console and studio manager console started as one surface for two
> roles; the Phase 1 root build (starting 2026-08-11) splits them into two
> consoles with different capabilities, not just a shared screen with a
> role flag — see `docs/adr/0008-studio-manager-role.md`.

Behind them: a Postgres database whose central table is one row per muscle group per assessment, a
scoring engine, an integration layer for the BodyMap measurement device and consumer wearables, and
an operations layer covering scheduling, resources, credits and notifications.

### 1.4 Service model

One-to-one only. No group formats in the first year — they dilute the measurement story and change
the staffing model.

| Service | Length | Price |
|---|---|---|
| Assisted Stretch | 30 min | AED 100 |
| Assisted Stretch — Long | 60 min | AED 190 |
| Compression Recovery | 30 min | AED 90 |
| Oxygen Reset | 20 min | AED 80 |
| Hydration / nutrition add-on | — | AED 25–35 |

Prices are working figures. What matters architecturally is the *shape*: a base session, longer
variants, equipment-led sessions that consume a resource rather than a coach, and small attachable
add-ons. The booking engine is built against that shape, so a pricing change is a row in a table.

### 1.5 Positioning — and the word we do not use

Marn is a **wellness and recovery studio**. It is not a clinic, and the distinction is load-bearing.

A clinic is regulated by the Dubai Health Authority, requires a licensed facility, requires licensed
physiotherapists rather than trained flexologists, and carries a different insurance and record-keeping
regime. That is a viable business but a slower and more expensive one, and it is not what we are
building first.

**Pain relief and physical rehab are the headline benefit we market — that's the whole point of the
product and it is not the thing this section restricts.** What's restricted is *how we describe
delivering it*: no diagnosing the cause of pain, no treatment plans, no promise to cure. We describe
measured change — "hip flexion up 9°, reported pain down from 6 to 3" — and let the member draw their
own conclusion. Selling the outcome and staying out of clinical language are not in tension; the copy
just has to do the first without doing the second.

The consequence runs all the way into the codebase and is not merely a marketing preference:

- Staff are **coaches** or **flexologists**. Never *therapists*.
- Customers are **members**. Never *patients*.
- Sessions produce **assessments** and **observations**. Never *diagnoses* or *treatment plans*.
- Scores are **fitness metrics**. The app says *below your target range*, never *your recovery is poor*.
- Readiness screening is a **referral gate**, not a liability form. Red flags route people to a doctor.

That last point deserves emphasis because it is the one that is both ethically right and legally
protective. A member reporting acute pain, recent surgery, neurological symptoms or cardiac history
should be blocked from booking and told to see a physician. Building that as a hard gate rather than a
soft warning is the clearest possible evidence that we are not practising medicine — and it is simply
the correct thing to do to someone who has walked in unwell.

### 1.6 Constraints shaping every decision

1. **One engineer.** A solo CTO working with a coding agent. Every architectural choice is measured
   against whether one person can operate it at two in the morning.
2. **Three months to studio opening.** The coach console must be usable on day one because it is the
   only piece the business cannot run without.
3. **Data residency.** Health data generated in the UAE should be hosted in the UAE. The prototype is
   not, and must never hold a real member's record.
4. **Future formats.** Container pods at golf courses and sports facilities are a stated phase-three
   ambition, which makes offline-capable capture a design requirement now rather than a retrofit.

---

## 2. The opportunity

### 2.1 Market

The UAE, and Dubai in particular, is unusually well suited to an app-led pain-relief and rehab business:

- **A young, high-income, health-engaged expatriate population.** The overwhelming majority of Dubai's
  residents are expatriates, disproportionately professional and disproportionately willing to spend on
  preventative health.
- **A large and visible endurance and fitness scene.** Runners, cyclists, Hyrox competitors, padel and
  golf. These are people who already own wearables and already think in numbers, which means the core
  product needs no education.
- **Desk-bound professional work in a car-dependent city.** Hip flexor shortening and thoracic stiffness
  are close to universal in the target segment.
- **Corporate wellness budgets that exist and are looking for something to buy.** Most current spend
  goes on gym subsidies with no measurable outcome. A per-employee mobility report is a materially
  easier sell than a discount code.

### 2.2 Segments, in commercial priority order

**Professionals, 30–55.** The core. They come for pain, stay for the graph. Highest volume, most
predictable, most referable. Everything in the product is designed for this person first.

**Performance athletes.** Lower volume, higher frequency, highest word-of-mouth value. They care about
range-of-motion numbers more than anyone and will use the wearable integrations properly. Disproportionate
marketing value relative to revenue.

**Longevity and 50+.** Growing fast, high willingness to pay, longest retention. Requires the most
careful handling: this is where readiness screening earns its keep and where clinical-sounding language
would be most dangerous.

**Corporate accounts.** The multiplier. One signed employer replaces months of individual acquisition,
and the aggregate anonymised reporting is only possible because of the measurement layer. Phase four,
but designed for from the schema up.

### 2.3 Why tracked progress is the wedge

Three things follow from a member being able to see their own relief measured, that do not follow from
a stretch session alone:

**Retention.** Service businesses churn because the customer cannot tell whether it worked. A member
looking at a hamstring arc that has moved from 52° to 71° over four months does not churn the way
someone with a half-used class pack churns.

**Referral.** A before-and-after progress card is shareable in a way that "I go to a stretch place" is
not. This is the cheapest acquisition channel available and it is a direct product of the data.

**Enterprise.** "Your engineering team's average thoracic rotation improved 14% over the quarter, and
reported back pain fell from 38% to 21%" is a renewal conversation. "Your staff used 340 sessions" is
not.

### 2.4 Honest risks to the thesis

The measurement story only works if the numbers are trustworthy. Range-of-motion measurement has real
inter-rater variability — two coaches measuring the same hamstring can differ by several degrees. If
members see their score bounce because a different coach measured them, the entire proposition collapses.

This is the single biggest product risk in the business and it is a protocol problem before it is a
software problem. Mitigations are covered in §5.5, but stated plainly here: **standardised measurement
protocol, device-first capture wherever possible, and score presentation that shows trend more
prominently than any single reading.**

---

## 3. Product vision

### 3.1 The member's year

**Week one.** They come in with a specific complaint — lower back after long drives, shoulder that
will not go overhead. They complete a readiness screening. A coach measures ten muscle groups. They
leave with a first assessment, a plain-language summary of what was found, and three home stretches.

**Month one.** Four sessions. The second assessment shows small movement. The app has stopped being
empty and has started being a record. They have done their home programme perhaps half the time,
and the app knows.

**Month three.** The graph now has a shape. Some groups have moved a lot and some have not, and the app
says so in both directions — *your hip flexors have gained 6°, your thoracic rotation hasn't moved and
that's now the limiter*. They have hit a consistency milestone. They have added one friend from the gym.

**Month six.** They are a different customer. They book without prompting, they have referred someone,
and the reason they do not stop is that stopping means watching the line go back down. Their employer
has started asking what they are doing.

That arc is the product. Everything in the feature list either serves it or is deleted.

### 3.2 The coach's shift

A coach arrives and opens the console. Today's floor is a list with times, names and services. Two
members have checked in from their phones: one slept badly and flags a stiff shoulder, one is fine.
One member carries a safety flag about a shoulder impingement, shown before the coach touches them.

Between sessions, the coach records what was done — modalities, duration, perceived exertion, pain
before and after — and writes two things: a clinical note for colleagues and a plain-language summary
for the member. The summary is mandatory. It is not paperwork; it is the product the member paid for.

Every sixth to eighth session the coach re-measures, either by importing from the BodyMap device or by
typing ten numbers. The member's app updates while they are still in the building.

**The design constraint that matters:** if the console is slower than a paper notebook, coaches will
use the notebook and the dataset will never exist. Speed on the floor outranks every other
consideration in that surface.

---

## 4. Feature specification

Each feature carries a phase marker: **P1** pilot, **P2** launch, **P3** depth, **P4** scale. The
roadmap in §11 sequences them.

### 4.1 Member app

#### 4.1.1 Scores and progress — strengths and weaknesses (P1/P2)

Four composite scores, each 0–100, each with its inputs visible on tap:

| Score | Meaning |
|---|---|
| **Flexibility** | Static range across all measured groups as a percentage of target arc |
| **Mobility** | Weighted toward the joints that gate real movement — hips, thoracic, shoulders, ankles |
| **Recovery** | Readiness: adherence, wearable signal, recent exertion, attendance |
| **Consistency** | Attendance and home-programme completion over a rolling window |

The progress view must present **both sides of the ledger.** Early versions of products like this show
only deficits, which is demoralising and, worse, inaccurate — a member who has gained 9° in hip flexion
while their calves stayed flat has a success and a problem, and the app should name both.

Concretely, the progress screen shows:

- **What's working** — the two or three groups with the largest gain since the previous assessment,
  named with the number.
- **What's limiting you** — the groups furthest from target arc, with an explanation of what that
  restricts in daily life, not just a percentage.
- **What hasn't moved** — groups that are neither improving nor severely restricted. This is the most
  actionable category and the one everyone forgets to surface.
- **Trend before value.** The chart is the primary object; the current number is secondary. This is
  partly a design preference and partly the mitigation for measurement variance described in §2.4.

#### 4.1.2 Whole-body range-of-motion map (P1)

Front and back anatomical figure, ten muscle groups coloured against target arc on a four-band scale
(restricted, limited, optimal, excellent). Tapping a group gives current degrees, target, percentage of
arc, drift since last assessment, and a plain-language note about what that joint governs.

**OPEN:** the prototype uses a simplified geometric figure. A properly drawn anatomical SVG is a design
task, not an engineering one, and should be commissioned before launch.

#### 4.1.3 Booking with live equipment availability (P2)

Booking is modelled on **resources**, not on services. A resource is a coach, a stretch bed, a
compression rig, an oxygen chamber, or the immersive sound room. A booking reserves one or more.

This matters because the studio sells things that are not coach-time. Compression boots and the sound
room are capacity-limited assets with their own utilisation curve, and a member should be able to see
*"boots free at 18:30"* the same way they see coach availability. Treating them as bolt-on extras
rather than first-class bookable resources is the modelling error that would force a rewrite in month
six, and it also under-sells genuinely differentiating equipment.

The same abstraction gives us, for free: multi-resource bookings (stretch then boots), equipment-only
sessions with no coach, room-constrained scheduling, and eventually home-service dispatch, which is
just a resource with a travel radius.

#### 4.1.4 Community — friends and shared progress (P3)

Members can add friends and see each other's progress. This is a genuine retention mechanic in a
category where accountability is most of the battle, and the gym-partner dynamic already exists offline.

**It is also the feature most capable of causing real harm, and needs designing accordingly.**

Range-of-motion data, pain scores and safety flags are health data. A member's friend list is not a
lawful basis for disclosing it. The design rules are therefore non-negotiable:

- **Opt-in per member and per field.** Sharing is off by default. Turning on "share my progress" is a
  deliberate, explained action.
- **Scores and milestones only.** Friends see composite scores, streaks, milestones and session counts.
  Friends never see per-muscle clinical detail, coach notes, pain scores, readiness answers, or safety
  flags. These are separate database reads and separate permission checks, not a UI hide.
- **Mutual consent, and revocable.** A friend link requires acceptance by both parties and either can
  sever it, which immediately and retroactively removes access.
- **No leaderboards by default.** Ranking strangers by flexibility is a bad idea for a population that
  includes people in pain and people with body-image sensitivity. Friend comparison is opt-in; global
  ranking is not built.
- **No implicit disclosure through absence.** A member who stops attending should not have their
  disappearance broadcast.

#### 4.1.5 Milestones (P3)

Consistency and target-based milestones: session counts, attendance streaks, home-programme streaks,
first time a muscle group reaches its target arc, largest single-assessment gain, anniversary markers.
Shareable as a progress card, which doubles as the referral engine.

**Safety design, and this is not boilerplate.** Streak mechanics applied to physical training can push
people to train through pain or injury. Three rules:

- **Rest days do not break streaks.** Consistency is measured against a prescribed weekly cadence, not
  against consecutive days. A programme that says "four times a week" counts a streak on four.
- **Pain suppresses nudges.** A member whose last check-in reported high pain, or who carries an active
  safety flag, receives no streak-preservation prompts. The system should never nag someone who has
  just told it they are hurting.
- **Milestones celebrate range and consistency, never intensity.** No badge for a higher RPE. Nothing
  in the product should reward pushing harder.

#### 4.1.6 Home programme and adherence (P2)

Coach-prescribed self-stretches with descriptions, target durations and video. Members mark completion;
completion feeds the consistency and recovery scores. Idempotent per day.

#### 4.1.7 Pre-session check-in (P2)

Two taps before arriving: pain areas tapped on a body diagram, sleep quality, current pain level,
optional note. Surfaces on the coach's console before the member walks in. Extremely cheap to build,
disproportionate effect on perceived personalisation.

#### 4.1.8 Session history and summaries (P1)

Every completed session, with the coach's plain-language summary. This is the highest-value screen in
the app relative to its build cost.

#### 4.1.9 Wearable connection (P3)

Whoop, Apple Health, Garmin, Oura. Sharpens the recovery score from an estimate into a measurement.
Explicit consent, scoped, revocable. See §9.2 for the residency complication.

#### 4.1.10 Readiness screening (P1)

PAR-Q-derived questionnaire, completed with a coach at first visit. Cleared members can book;
uncleared members cannot. Red-flag answers produce a referral message, not a workaround.

### 4.2 Coach console

> As of the Phase 1 root build (2026-08-11), booking confirm/decline/reassign
> (§4.2.1, §4.2.2) moved to the studio manager console, not the coach
> console — a coach's schedule is read-only against already-approved
> bookings, and a coach's member-record access excludes contact and payment
> data. See `docs/adr/0008-studio-manager-role.md` for the full reasoning;
> not rewriting §4.2.1/§4.2.2 below wholesale since they still describe the
> feature correctly, just not on this console.

#### 4.2.1 Floor schedule (P1)
Today's bookings by time with member, service, resources, coach and status. Confirm, decline, reassign,
mark arrived. Tablet-first layout; must work on a laptop.

#### 4.2.2 Request inbox (P1)
Pending booking requests with member context and any safety flags visible before acceptance. Assign a
coach on confirm. Member is notified by push and WhatsApp.

#### 4.2.3 Assessment capture (P1)
Three routes in — BodyMap device import, file import, manual entry — all landing on one schema.
Manual entry is always available, works offline, and is the pilot's primary path. Previous values shown
alongside for sanity-checking, with implausible jumps flagged for confirmation rather than silently
accepted.

#### 4.2.4 Session logging (P1)
Modalities used, duration, RPE, pain before and after, internal clinical note, and the member-facing
summary. The summary field is **required** — the API rejects a session without one. Decrements credits,
advances streak, closes the booking, recomputes scores.

#### 4.2.5 Safety flags and contraindications (P1)
Persistent per-member flags surfaced on the schedule, in the request inbox, and at the top of the member
record. Created by coaches, cleared explicitly, timestamped and attributed.

#### 4.2.6 Programme prescription (P2)
Assign a home block from a template library or build one. Adherence flows back automatically.

#### 4.2.7 Coach outcome metrics (P3)
Sessions delivered, average pain reduction, average range gained per member. This is the number that
manages quality, informs progression and compensation, and — aggregated and anonymised — sells a
corporate contract. It is also politically delicate inside a small team and should be introduced as a
coaching tool before it is ever a performance-management one.

#### 4.2.8 Capacity and utilisation (P3)
Seven-day utilisation by day and by resource. Utilisation is the entire economics of a studio business;
anything under 40% is inventory to be sold at short notice, which leads directly to the waitlist feature.

#### 4.2.9 Waitlist and short-notice fill (P3)
When a slot frees inside a threshold, notify nearby members with matching preferences at a discount.
The single highest-ROI feature in the operational set, and only possible because we hold member
location preferences and booking patterns.

### 4.3 Corporate portal (P4)

Company administrator account; employee invitation and verification; pooled or per-employee credit
allocation; usage reporting; and **aggregate anonymised mobility reporting** with a minimum cohort size
(no report on a group small enough to identify an individual — 15 is a reasonable floor). Employers see
population trends. Employers never see an individual's data, and the product should say so loudly,
because the fear that it might is the main objection to enterprise wellness tooling.

### 4.4 Administration (P2/P3)

Service and price management, resource and site management, coach roster and permissions, credit and
package administration with a full audit trail, and content management for the home-programme library.

---

# PART TWO — THE MEASUREMENT SYSTEM

---

## 5. Measurement, scoring and the device boundary

### 5.1 Why this chapter comes before architecture

Most of this system is unremarkable. Booking, payments, notifications and rostering are solved problems
and the implementation choices barely matter. The measurement layer is the part that is specific to
this business, the part that is hardest to change later, and the part that determines whether there is
a company here at all. It gets designed first.

### 5.2 The canonical model

Three entities, and the relationship between them is the whole design.

**Assessment** — one capture event. Who was measured, by whom, when, by what method, on what device.

**Measurement** — one number about one thing: a muscle group, a joint angle in degrees, and the target
for that group. Ten per assessment today; the schema does not care if it becomes thirty.

**Target** — the reference arc a group is measured against. Currently a global constant per group. It
should eventually be adjusted for age and sex, because a 58-year-old member measured against a
25-year-old's normative range is being told something both discouraging and untrue. **OPEN: normative
reference data source and adjustment model.**

Measurements are stored as **individual rows, not as a JSON blob on the assessment.** This is the single
most consequential schema decision in the document. A blob is faster to write today and makes the
question that justifies the entire company — *show me left hamstring across every member over eighteen
months, segmented by age* — an unindexable string-parsing exercise. One row per measurement, indexed on
member and muscle key and date.

### 5.3 The ten groups

| Key | Group | Region | Target |
|---|---|---|---|
| `hamstrings` | Hamstrings | Lower | 90° |
| `hip_flexors` | Hip Flexors | Lower | 20° |
| `quadriceps` | Quadriceps | Lower | 140° |
| `glutes` | Glutes | Lower | 30° |
| `calves` | Calves | Lower | 20° |
| `lower_back` | Lower Back | Core | 60° |
| `thoracic` | Thoracic Spine | Core | 45° |
| `shoulders` | Shoulders | Upper | 180° |
| `chest` | Chest (Pecs) | Upper | 45° |
| `neck` | Neck | Upper | 80° |

**OPEN:** bilateral capture. Left and right differ, sometimes substantially, and asymmetry is
clinically more interesting than absolute range. The schema carries a `side` field from day one but
the pilot captures a single value per group to keep assessment under ten minutes. Revisit once the
BodyMap output format is known — if the device reports bilaterally, capture bilaterally.

### 5.4 Scoring

All scoring lives in one file with no database and no UI imports, because it will be rewritten once a
physiotherapist has opinions about the weights, and that rewrite should touch nothing else.

**Flexibility** — mean of `degrees ÷ target` across all measured groups, as a percentage. Simple,
explainable, and defensible to a member who asks how it is calculated.

**Mobility** — weighted toward the joints that gate compound movement: thoracic 0.30, hip flexors 0.25,
shoulders 0.25, calves 0.20. These weights are a judgement call and should be treated as provisional.

**Recovery** — a blend of home-programme adherence, wearable linkage, recent perceived exertion and
attendance streak. The wearable term is currently a flat bonus for having a device connected, which is
a placeholder for real HRV and sleep. When a real signal arrives, the function's shape does not change.

**Consistency** — attendance against prescribed cadence plus home-programme completion over a rolling
28 days. Deliberately separate from Recovery so that a member can be consistent without being
well-recovered, and vice versa.

**Presentation rule:** every score shows its inputs on tap. A number a member cannot interrogate is a
number they will not trust, and trust in these four numbers is the whole business.

### 5.5 Measurement reliability

§2.4 named this as the largest product risk. The mitigations:

1. **Written protocol per group** — member position, stabilisation, landmark, end-point definition.
   Laminated at each bed. This is a training artefact, not software, and it is the highest-leverage
   thing in this section.
2. **Device-first.** BodyMap capture wherever available; manual entry recorded as a distinct `source`
   so that variance can be analysed by method later.
3. **Same-coach re-test where scheduling allows,** recorded either way via `coachId` on the assessment.
4. **Implausible-delta confirmation.** A change beyond a configurable threshold prompts the coach to
   confirm rather than silently writing an outlier.
5. **Trend over value in the UI**, so a single noisy reading does not read as regression.
6. **Eventually: a variance dashboard** measuring inter-coach spread on the same member. Once there is
   enough data, this becomes a training tool.

### 5.6 The BodyMap boundary

BodyMap is a third-party measurement device that reports mobility and flexibility figures to coaches.
**Its integration surface is currently unknown**, which makes it the largest technical unknown in the
build.

The response is an anti-corruption layer. No BodyMap data format touches the database. Everything lands
on `NormalisedMeasurement[]` through an adapter, and three adapters are planned:

| Adapter | Status | Purpose |
|---|---|---|
| `fromDeviceApi` | Stub, signature fixed | If the vendor exposes REST or webhooks |
| `fromExportFile` | Stub, signature fixed | CSV/JSON dropped by a studio-side agent |
| `fromManualEntry` | **Implemented** | Coach types the numbers. Always available |

The adapter drops unrecognised muscle keys rather than guessing at them. Silent coercion of unknown
data is how a measurement dataset quietly becomes worthless.

Manual entry being permanently first-class is not a fallback grudgingly retained. It is what lets the
pilot run before any integration exists, what keeps a container pod working with no connectivity, and
what makes a second measurement vendor a one-file change.

**What we need from the vendor, in priority order:** a sample export file; the technical contact; whether
the device exposes an API or writes to a local database; whether it reports bilaterally; and what
identifier it uses for a person, since that determines whether we can match records automatically or
need a manual link step.

---

# PART THREE — ENGINEERING

---

## 6. System architecture

### 6.1 Shape

One deployable. A Next.js application serving the member web surface, the coach console, the corporate
portal and the API, backed by a single Postgres database. The mobile app is a React Native client
against the same API.

```
   iOS / Android            Mobile web            Desktop web
   (React Native)          (member)          (coach, corporate)
         │                     │                     │
         └─────────────────────┴─────────────────────┘
                               │  HTTPS / JSON
                    ┌──────────▼──────────┐
                    │   Next.js app       │
                    │  ─────────────────  │
                    │  route handlers     │
                    │  scoring engine     │
                    │  adapters           │
                    │  job runner         │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────▼─────┐   ┌──────▼──────┐  ┌──────▼──────┐
        │ Postgres  │   │ Object store│  │  External   │
        │  (health  │   │  (media,    │  │  BodyMap    │
        │   tier)   │   │   exports)  │  │  wearables  │
        └───────────┘   └─────────────┘  │  WhatsApp   │
                                         │  payments   │
                                         └─────────────┘
```

This is deliberately unfashionable. There is no service mesh, no message broker, no separate API
gateway, no microservices. One person cannot operate a distributed system and should not try. Every
component removed from this diagram is a component that cannot page you at 3am.

### 6.2 Why one deployable

Splitting the API from the web app would buy independent scaling we do not need and cost a network hop,
a second deploy pipeline, a CORS configuration and a duplicated type definition. The mobile app is a
separate client, not a separate service, and it consumes the same routes the web app does.

### 6.3 Background work

Jobs — notification dispatch, nightly score rollups, re-test reminders, waitlist fills, wearable
polling — run through **pg-boss**, a queue that lives inside Postgres. This deletes Redis from the
operational surface entirely. It is not the fastest queue available; it is the one that adds zero
infrastructure and can be inspected with SQL.

### 6.4 Data tiering

Two logical tiers with different residency requirements:

**Health tier** — members, assessments, measurements, sessions, flags, check-ins, programmes, scores.
UAE-resident. Never leaves.

**Operational tier** — product analytics, marketing attribution, error telemetry, CRM. May live
anywhere, and must be scrubbed of health data before it does. Practically, this means error reporting
is configured to strip request bodies by default rather than allow-list them, because the failure mode
of the opposite choice is a member's pain score sitting in a foreign log aggregator.

### 6.5 Offline capability (P4, designed for now)

Container pods at golf courses and sports facilities will lose connectivity. The coach console must
capture an assessment and a session with no network and sync later.

The design: assessment and session writes are **client-generated UUIDs queued locally and replayed**.
They are append-only and effectively conflict-free — two coaches do not edit the same session. Booking
is *not* offline-capable, because double-booking a resource is a real conflict with no clean automatic
resolution; a pod with no connectivity accepts walk-ins and reconciles later.

Building this in phase four is acceptable. Designing the write path as append-only and
client-ID-generated **now** is what makes phase four a feature rather than a rewrite.

---

## 7. Technology stack and decision log

### 7.1 The stack

| Layer | Choice |
|---|---|
| Language | TypeScript, end to end |
| Repo | Turborepo monorepo |
| Web + API | Next.js (App Router), route handlers |
| Mobile | React Native via Expo |
| Database | PostgreSQL |
| Query layer | Drizzle ORM, migrations in repo |
| Jobs | pg-boss |
| Auth | better-auth, self-hosted, phone OTP primary |
| Object storage | S3-compatible |
| Styling | CSS custom properties, shared token file |
| Hosting (prototype) | Vercel + Neon |
| Hosting (production) | Containers, UAE region |

### 7.2 Decisions and the alternatives rejected

**TypeScript everywhere.** One language across mobile, web, API and scripts. For a solo engineer this
is not a preference, it is a survival requirement. Shared domain types mean a change to the measurement
schema breaks compilation everywhere it is wrong, immediately.

**Monorepo.** *Rejected: separate repos per surface.* Separate repos mean a published shared package, a
versioning dance, and drift. One repo, one commit, one truth.

**Next.js as both frontend and API.** *Rejected: NestJS or Fastify as a separate API.* A separate API
is the right answer for a team of five. For one person it is a second deploy target and a second set of
logs to correlate.

**Expo for mobile.** *Rejected: native Swift and Kotlin.* Two native codebases is two to three times the
mobile work for UI that is overwhelmingly data display. The one place native depth is genuinely
required is Apple HealthKit, which Expo handles with a config plugin and a development client.

**Drizzle.** *Rejected: Prisma.* Prisma is friendlier; Drizzle produces SQL you can read, which matters
disproportionately when the interesting queries are analytical aggregations over the measurements table.

**pg-boss.** *Rejected: BullMQ with Redis, or a hosted queue.* Deletes an entire piece of
infrastructure. Revisit only if job volume genuinely outgrows Postgres, which is many thousands of
members away.

**Self-hosted auth.** *Rejected: Clerk, Auth0, Supabase Auth.* All three are excellent and all three
put identity data on foreign infrastructure, which is an argument we would rather not have with a
regulator about a health service. Phone OTP with a UAE SMS provider keeps identity in our database.

**Postgres over a connection string, with no vendor extensions.** *Rejected: Supabase's client
libraries, PostgREST-from-the-browser, row-level-security-as-authorisation.* Every one of those is a
good tool and every one welds the application to a vendor that has no UAE region. Authorisation lives
in application code where it can be read, tested and audited.

**Vercel and Neon for the prototype only.** Chosen for speed to a shareable link. Neon specifically
because its free tier does not pause a project into unavailability after a week of inactivity, which
matters when an investor might open the link on a quiet Tuesday. Nothing Neon-specific exists outside
one file.

### 7.3 The portability rule

Written down because it is the rule most likely to be violated under deadline pressure:

> No vendor-proprietary primitive enters the codebase. The database is reached by connection string.
> The application builds to a standard container. Hosting and database are configuration, not
> architecture.

The cost of following this rule is a few days of foregone convenience. The cost of breaking it is
discovering in month seven that moving to UAE hosting means a rewrite, at exactly the moment the first
corporate client asks where the data lives.

---

## 8. Regulatory position, privacy and data residency

*This chapter is written from a technical reading of public sources. It is not legal advice, and every
material claim in it should be confirmed by UAE-qualified counsel before the first real member record
exists.*

### 8.1 The residency rule

UAE Federal Law No. 2 of 2019 on the Use of Information and Communication Technology in Health Fields
restricts the storage, processing and transfer outside the UAE of health data generated in connection
with health services provided in the UAE. Ministerial Resolution 51 of 2021 introduced specific
exceptions, but the default position remains restrictive.

Whether a non-DHA-licensed wellness studio falls within scope is genuinely arguable — the law's
operative definitions attach to health facilities, and we are deliberately not one. But the statute's
scope language reaches services indirectly related to healthcare that handle electronic health data,
and joint angles, pain scores and HRV are health data on any reasonable reading. Separately, the UAE
Personal Data Protection Law treats health data as a special category regardless of who holds it.

**The engineering position is therefore to comply as though the rule applies.** The cost difference
between hosting in the UAE and hosting elsewhere is negligible. The cost of migrating a live clinical
dataset after a regulator or a corporate client's procurement team asks the question is not.

### 8.2 Consequences

- Managed platforms without a UAE region — Supabase, Firebase, Neon, PlanetScale, Vercel's own data
  products — are unavailable for the health tier in production. **They are fine for the prototype
  precisely because it holds no real data.**
- Wearable aggregators such as Terra, Rook and Spike route through US or EU infrastructure. Using one
  is likely an export. Either integrate directly into the UAE backend or obtain counsel's sign-off.
- LLM features that touch health data need a UAE-resident inference endpoint. This constrains the
  auto-summary feature described in §9.5 and is the reason it is not in the pilot.
- Analytics and error reporting must be configured to exclude health data by default.

**OPEN:** final region. AWS `me-central-1` (UAE), Azure UAE North, and local providers are all
candidates, and the choice is currently deferred. This is precisely why §7.3 exists — the decision can
wait because it is configuration.

### 8.3 Consent

Separate, granular, revocable, logged:

| Consent | Scope |
|---|---|
| Service | Assessment, session records, coach notes |
| Wearable | Named provider, named data types |
| Community | Sharing scores and milestones with accepted friends |
| Corporate | Inclusion in an employer's anonymised aggregate reporting |
| Media | Photographs and video, for progress records or marketing, separately |
| Marketing | Communications, entirely separate from all of the above |

Every consent is timestamped, versioned against the policy text in force at the time, and revocable
without losing access to the service. A member who withdraws community consent has their shared data
withdrawn from friends' views immediately and retroactively.

### 8.4 Retention and subject rights

Wellness records, not medical records, so mandatory clinical retention periods do not apply — but
members will ask for their data and occasionally for its deletion. Build export and deletion as real
capabilities from the schema up: every table carries `memberId`, and a deletion routine that walks them
is a day's work now and an archaeological dig later.

**Deletion is anonymisation, not destruction, for aggregate purposes.** A deleted member's measurements
may remain in de-identified aggregate statistics; their identity, contact details, notes and history
are removed. This must be stated plainly in the privacy policy rather than discovered.

### 8.5 Marketing claims

The wellness positioning constrains what may be said, in the product and outside it. No treatment
claims, no cure claims, no pain-relief guarantees, no before-and-after imagery implying medical
outcome. "Members improved average hip flexion by 14% over twelve weeks" is a factual statement about
our own data. "Fixes back pain" is a medical claim and would invite exactly the regulatory attention
the positioning exists to avoid.

---

## 9. Integrations

### 9.1 BodyMap
Covered in §5.6. Highest-priority unknown; three adapters, one canonical output.

### 9.2 Wearables (P3)

Whoop, Apple Health, Garmin, Oura. Apple Health is the awkward one: it is read on-device only, which
means the mobile app extracts and forwards rather than the server polling an API. That is a feature,
not a limitation — the data path runs from device to UAE backend with no third party in between.

Aggregators such as Terra, Rook and Spike would save perhaps two weeks of integration work per provider
and would introduce a foreign processor into the health-data path. Start with direct Whoop and Apple
integrations; revisit only with counsel's sign-off.

Scope requests to what the recovery score actually needs: heart-rate variability, sleep duration and
quality, resting heart rate, daily strain. Not location, not workout GPS, not anything we cannot justify
holding.

### 9.3 Notifications

**Push** via Expo to APNs and FCM. **WhatsApp Business API** through a business solution provider —
Twilio, 360dialog, or a regional provider such as Unifonic. This is not optional in this market: a
booking confirmation that does not arrive on WhatsApp has, functionally, not arrived. Email is for
receipts and corporate reporting. SMS is the OTP fallback.

WhatsApp template approval takes days to weeks and is a common launch-blocker. Start that process in
the first week of the build, not the last.

### 9.4 Payments (P2)

**OPEN — deferred by decision.** Candidates: Stripe, Network International, Telr; plus Tabby or Tamara
for buy-now-pay-later on multi-session packages, which materially lifts average package size in this
market. Apple Pay and Google Pay expected.

Whatever is chosen, the internal model is a **credit ledger, not a counter**. Packages, memberships,
expiry, freezes, corporate-funded credits, refunds and gifted sessions are all entries in an append-only
ledger with a derived balance. The alternative — a `sessions_remaining` integer that gets edited — is
where booking systems' data integrity reliably dies, and the first billing dispute in month eight is
when you find out.

### 9.5 Auto-generated session summaries (P4)

The coach records structured findings; a language model drafts the member-facing summary for the coach
to approve. A real consistency win, deferred for two reasons: it sends health data to an inference
endpoint and therefore needs a UAE-resident option (§8.2), and a coach's own words in month one are
better training material than a model's.

### 9.6 Calendar and corporate identity (P4)
Calendar invitations for confirmed bookings. Single sign-on for corporate portal administrators. Both
straightforward, both worth nothing until corporate accounts exist.

---

## 10. Security and access

### 10.1 Identity
Phone number as primary identifier, OTP authentication, optional Apple and Google sign-in. Separate
identity domains for members and staff — a coach account is not a member account with a flag set,
because that conflation is how privilege-escalation bugs are born.

### 10.2 Roles

| Role | Access |
|---|---|
| Member | Own record only. Friends' shared scores where mutual consent exists |
| Coach | Assigned members at their site — check-in and session context needed for the session; assessment and session write; flag management. **Not** contact or payment details, and **not** booking approval as of the Phase 1 root build |
| Studio manager | All members at their site (coach access plus contact/payment); roster, shifts, capacity, credits and pricing; sole booking approval as of the Phase 1 root build |
| Corporate admin | Aggregate reporting for their organisation. **Never** individual records |
| Platform admin | Everything, with every action logged |

> The bolded exceptions were added 2026-08-11 — see
> `docs/adr/0008-studio-manager-role.md`. Booking approval is no longer
> "coach, plus manager oversight"; it moved to the manager exclusively.

Authorisation is enforced server-side on every route against the authenticated identity. Client-side
role checks are presentation only and are assumed hostile.

### 10.3 Audit

Append-only audit log covering: assessment created or amended; session logged or edited; flag raised or
cleared; readiness status changed; credit adjusted; consent granted or withdrawn; member record exported
or deleted; and any staff read of a member record outside their own site.

This is not a compliance checkbox. The first time a member disputes what a coach recorded, this log is
the only thing standing between a conversation and a problem.

### 10.4 Practical controls
TLS everywhere. Encryption at rest. No health data in logs or error reports. Secrets in the platform
secret store, never in the repository. Dependency scanning in CI. Rate limiting on OTP and booking
endpoints. Backups encrypted, retained in-region, and **restore-tested quarterly** — an untested backup
is a belief, not a backup.

---

## 11. Build roadmap

Sequenced as vertical slices. Each phase ends with something usable on the studio floor, because a solo
engineer cannot afford a phase that produces only foundations.

### Phase 1 — Pilot (weeks 0–8)
**Goal: the studio can open and operate.**

Schema and migrations · coach authentication · member roster and creation · readiness screening ·
assessment capture, manual first, with the BodyMap adapter stubbed · session logging with mandatory
member summary · safety flags · scoring engine · member web portal, read-only — scores, body map,
progress, session summaries · manual booking entry by staff.

*Exit criterion: a coach can run a full day, and every member can see their results, without a
spreadsheet existing anywhere in the building.*

### Phase 2 — Launch (weeks 8–14)
**Goal: members self-serve.**

Member authentication · self-service booking on the resource model · payments and the credit ledger ·
push and WhatsApp notifications · home programmes and adherence · pre-session check-in · mobile app,
iOS first with Android within three weeks · cancellation policy.

*Exit criterion: a member joins, books, pays, attends and reads their results with no staff
intervention at any step.*

### Phase 3 — Depth (months 4–7)
**Goal: retention mechanics and a second site.**

Wearable integrations · community with the consent model in §4.1.4 · milestones with the safety rules in
§4.1.5 · waitlist and short-notice capacity fill · capacity and coach-outcome dashboards · multi-site ·
re-test cadence reminders · referral tracking.

### Phase 4 — Scale (months 7–12)
**Goal: enterprise and new formats.**

Corporate portal · offline capture and sync for pod sites · **migration to UAE-hosted production** ·
auto-generated summaries once a compliant endpoint exists · outcome analytics · Arabic and RTL.

### Sequencing rules
- Coach console before member app, always. The console is operationally load-bearing; the app is not.
- No feature ships to members before it works on the floor.
- The UAE migration happens before the first corporate contract, not after it is signed.
- Arabic is deferred but never architecturally blocked: user-facing strings go through a lookup from day
  one, and layouts avoid direction-dependent assumptions.

---

## 12. Non-functional requirements

**Performance.** Member app cold start under three seconds on mid-range Android. Coach console
interaction under 200ms for anything used on the floor. Assessment save under one second — a coach
standing next to a member will not wait, and if they wait twice they will reach for paper.

**Availability.** 99.5% during studio hours, 06:00–22:00 GST. Degraded service outside those hours is
acceptable. The console must fail soft: if the network drops, capture continues locally.

**Scale targets.** Year one: one site, roughly 500 active members, 40 sessions a day. Year three: four
sites, roughly 4,000 members, 200 sessions a day, plus corporate accounts. These are small numbers and
the architecture should not pretend otherwise — the measurements table reaches perhaps two million rows
in three years, which is unremarkable for Postgres on modest hardware.

**Environments.** Local, preview per pull request, production. Preview branches get a throwaway database
branch. Production migrations are reviewed and never automatic.

**CI/CD.** Type check, lint, unit tests on the scoring engine and adapters, build. Deploy on merge to
main. Migrations run as an explicit, separate step.

**Observability.** Structured logs with correlation IDs and no health data. Error tracking with request
bodies stripped by default rather than allow-listed. Uptime checks on the API and database. One
dashboard — sessions logged today, assessments captured, booking failures, notification delivery, job
queue depth — small enough to glance at daily and therefore actually looked at.

**Testing.** Scoring and adapters get real unit tests; they are pure functions with real consequences.
The booking engine gets integration tests around resource conflicts and the credit ledger. The UI gets
smoke tests on critical paths and nothing more — a solo engineer maintaining a large UI test suite is
maintaining a test suite instead of a product.

---

## 13. Cost model

Infrastructure only. Excludes fit-out, equipment, salaries, rent and marketing.

**Prototype and pre-launch:** effectively zero. Free tiers throughout, plus one deployment platform
subscription if the demo link needs commercial terms.

**Year one, single site — monthly, USD:**

| Item | Estimate |
|---|---|
| Compute, UAE region | 80–150 |
| Postgres, managed, with backups | 60–120 |
| Object storage and CDN | 15–30 |
| WhatsApp Business API and templates | 50–150 |
| SMS OTP | 30–80 |
| Push notifications | 0 |
| Error tracking and uptime monitoring | 30–60 |
| Apple and Google developer accounts | ~12 amortised |
| **Total** | **≈ 300–600** |

**Year three, four sites plus corporate:** roughly 1,200–2,500 a month, dominated by messaging volume
rather than compute. Messaging cost scales with member count; compute barely moves. If a line item
surprises you later, it will be WhatsApp.

**Non-infrastructure engineering costs to budget separately:** anatomical illustration for the body map,
the home-programme video library, penetration testing before the first corporate contract, and UAE legal
review of the residency and consent position.

---

# PART FOUR — RISK AND REFERENCE

---

## 14. Risk register

Ordered by expected damage, not by probability. Each carries an owner-level response rather than a
generic "monitor".

### 14.1 Measurement variance destroys the proposition
**Severity: critical.** If members see their scores move because a different coach measured them, the
entire premise fails and the failure is invisible until it is advanced.
**Response:** written protocol per group (§5.5), device-first capture, trend-dominant presentation,
implausible-delta confirmation, and an inter-coach variance dashboard once data volume allows. Treat
this as a training investment, not a software one.

### 14.2 BodyMap does not integrate
**Severity: high. Probability: moderate.** The vendor may expose no API, no export, or a closed desktop
application.
**Response:** already mitigated architecturally. Manual entry is first-class and is the pilot's primary
path. Worst case is ninety seconds of coach time per assessment, which is a cost, not a blocker. Obtain
a sample export and a technical contact early so the cost is known rather than assumed.

### 14.3 Regulatory reclassification
**Severity: high.** A regulator takes the view that assisted stretching with measurement constitutes a
health service requiring DHA licensing.
**Response:** the language discipline in §1.5 and the referral gate in §4.1.10 are the primary defence.
Obtain a written legal opinion before opening, and structure so that becoming licensed is an upgrade
path rather than a rebuild — the data model already supports licensed practitioners as a coach type.

### 14.4 Data residency enforcement
**Severity: high. Probability: low near-term, rising with scale.**
**Response:** the portability rule (§7.3). Migration is a connection string and a container image.
Complete it before the first corporate contract, since procurement will ask.

### 14.5 Solo engineering capacity
**Severity: high. Probability: high.** One person building three surfaces while a studio opens is the
most likely source of schedule failure, and no architecture fixes it.
**Response:** ruthless phase discipline. The console is the only thing that must exist at opening.
Everything in Phase 3 and 4 is genuinely optional for a year. Identify, now, the point at which a second
engineer or a contractor is hired, and what triggers it.

### 14.6 Coaches bypass the console
**Severity: high.** If the console is slower than paper, the dataset never accumulates and every
downstream claim in this document evaporates.
**Response:** floor-speed requirements in §12 are hard requirements. Test with real coaches in week
three, not week twelve. Watch a coach use it in person before believing any of it works.

### 14.7 Community feature causes a privacy incident
**Severity: high.** Health data exposed to a friend, an ex-partner, or a colleague.
**Response:** the consent model in §4.1.4. Separate reads, separate permission checks, opt-in per field,
mutual and revocable links, no leaderboards. If this cannot be built properly, it should not be built.

### 14.8 Streak mechanics encourage training through injury
**Severity: moderate, but reputationally severe if it happens.**
**Response:** rest days do not break streaks; pain suppresses nudges; nothing rewards intensity (§4.1.5).

### 14.9 Trademark collision
**Severity: moderate. Probability: unknown until cleared.**
**Response:** clear "Marn" in UAE classes covering fitness and wellness services and software before any
spend on signage, app store listings or domains.

### 14.10 Utilisation below break-even
**Severity: moderate, and a business risk rather than a technical one.**
**Response:** the waitlist and short-notice fill feature exists precisely for this, and is the reason it
is not treated as a nice-to-have.

### 14.11 Single-engineer key-person risk
**Severity: moderate.** One person holds the entire system in their head.
**Response:** this document. Plus: no undocumented deploy steps, secrets held in a shared vault with
recovery access, and a README that a competent stranger could follow.

---

## 15. Appendices

### Appendix A — Data dictionary

**coaches** — id, name, initials, title, siteId, isDemo, createdAt

**members** — id, name, phone, goal, persona, joinedAt, credits, streak, wearable, parqCleared, parqAt,
isDemo, createdAt

**flags** — id, memberId, text, since *(contraindications and safety notes)*

**assessments** — id, memberId, coachId, capturedAt, source `bodymap|manual`, deviceId, createdAt

**measurements** — id, assessmentId, memberId, muscleKey, degrees, target *(one row per group; the
central table of the business)*

**bookings** — id, memberId, coachId, serviceId, date, time, status
`requested|confirmed|completed|cancelled`, addons, aed, createdAt

**sessions** — id, memberId, coachId, bookingId, completedAt, mins, modalities, rpe, painBefore,
painAfter, coachNotes *(internal)*, memberSummary *(member-facing, required)*, createdAt

**programs** — id, memberId, coachId, title, assignedAt, moves, completions

**checkins** — id, memberId, at, sleep, pain, areas, note

**scoreDays** — id, memberId, date, flexibility, mobility, recovery *(denormalised for chart reads)*

**Not yet built:** `sites`, `resources`, `resourceBookings`, `creditLedger`, `consents`, `auditLog`,
`friendships`, `milestones`, `organisations`, `orgMembers`. Each is named here so the eventual migration
is expected rather than discovered.

### Appendix B — API surface

See `API.md` in the repository for the live contract. Current shape:

- **Read** — `GET /snapshot`, `GET /availability`, `GET /members/:id`, `GET /admin/tables`
- **Identity** — `POST /members`, `POST /coaches`, `POST /members/:id/parq`,
  `POST|DELETE /members/:id/flags`, `POST /members/:id/wearable`
- **Booking** — `POST /bookings`, `POST /bookings/:id/confirm`, `POST /bookings/:id/decline`,
  `DELETE /bookings/:id`
- **Measurement** — `POST /integrations/bodymap/import`, `POST /members/:id/assessments`
- **Session** — `POST /sessions` *(422 without a member summary)*
- **Programme** — `POST /members/:id/programs`, `POST /programs/:id/complete`
- **Intake** — `POST /checkins`

`GET /snapshot` returns the whole dataset and is a prototype convenience. It must be replaced with
scoped, paginated endpoints before there is real volume; it is noted here so it is not inherited by
accident.

### Appendix C — Glossary

**Adherence** — whether a member completed the home programme they were prescribed.

**Anti-corruption layer** — a translation boundary. External data formats are converted to our schema at
the edge, so a vendor change touches one file.

**Assessment** — one capture event containing many measurements.

**Composite score** — a single 0–100 figure derived from many measurements, so members have something
simple to track.

**Contraindication** — a condition making a specific intervention unsafe for a specific person.

**Credit ledger** — append-only record of session credits bought, used, expired, frozen or gifted, with
a derived balance.

**Flexologist** — a trained assisted-stretching coach. Not a licensed medical title, and the reason we
never say *therapist*.

**Goniometer** — the instrument used to measure joint angle. The arc that appears throughout the product
is drawn from its face.

**HRV** — heart-rate variability, the millisecond variation between heartbeats; the basis of most
wearable recovery scores.

**Longitudinal** — data about the same person over time, as opposed to a single snapshot. The entire
value of the product.

**Modality** — a technique or piece of equipment used in a session: assisted stretch, PNF, compression
boots, oxygen, immersive sound.

**PAR-Q** — Physical Activity Readiness Questionnaire; the standard pre-exercise screening instrument.

**PNF** — proprioceptive neuromuscular facilitation, a contract-relax stretching technique.

**Resource** — anything a booking consumes: a coach, a bed, a compression rig, a chamber, a room.

**ROM** — range of motion, measured in degrees.

**RPE** — rate of perceived exertion, a 1–10 self-report of session intensity.

**Target arc** — the reference range of motion a group is measured against.

### Appendix D — Build prompts for a coding agent

Each prompt assumes the repository, this document and `API.md` are in context. Run them in order; each
should end with a working, committable state.

**D1 — Schema and migrations**
> Extend `db/schema.ts` with the tables listed as *not yet built* in Appendix A: sites, resources,
> resourceBookings, creditLedger, consents, auditLog, friendships, milestones, organisations,
> orgMembers. Follow the existing conventions — text primary keys, explicit foreign key columns, jsonb
> for genuinely unstructured fields only. Generate a migration. Do not modify existing tables except to
> add a `siteId` to bookings and sessions.

**D2 — Resource-based booking**
> Replace service-based availability with resource-based availability per §4.1.3. A booking reserves one
> or more resources. Add conflict detection per resource. Compression boots, the oxygen chamber and the
> immersive sound room become resources with their own capacity. Availability must return which
> resources are free, not just which times.

**D3 — Credit ledger**
> Replace the `credits` integer on members with an append-only ledger per §9.4. Entry types: purchase,
> consumption, expiry, freeze, unfreeze, refund, gift, corporate grant. Balance is derived, never
> stored. Add integration tests covering double-spend, expiry at a boundary, and refund after
> consumption.

**D4 — Authentication and authorisation**
> Add better-auth with phone OTP. Separate member and staff identity domains per §10.1. Enforce the role
> matrix from §10.2 server-side on every route. Add an authorisation test per route asserting that a
> member cannot read another member's record and a corporate admin cannot read any individual record.

**D5 — Scoring v2**
> Add the Consistency score per §5.4. Make target arcs adjustable by age band, defaulting to current
> global values. Keep everything in `lib/scoring.ts` with no database or React imports. Unit-test each
> function against a fixture set including empty-measurement and single-assessment cases.

**D6 — Mobile app**
> Add `apps/mobile` as an Expo React Native app consuming the existing API. Port the member surfaces
> from `components/Member.tsx`, sharing types from `packages/core`. iOS first. Apple HealthKit via a
> config plugin and development client. Reuse the design tokens from `app/globals.css`.

**D7 — Community and milestones**
> Implement friendships and milestones per §4.1.4 and §4.1.5. Sharing is opt-in per field and off by
> default. Friends' scores and milestones are served from a dedicated endpoint that reads only shareable
> fields — do not filter a full member payload in the client. Rest days must not break streaks, and
> members with an active safety flag or a recent high-pain check-in receive no streak prompts.

**D8 — Offline capture**
> Make assessment and session writes offline-capable per §6.5. Client-generated UUIDs, local queue,
> replay on reconnect, idempotent server handlers. Booking stays online-only. Add a visible sync state
> in the coach console — a coach must always know whether their work has been saved.

---

## Closing note

The largest risks in this plan are not technical. They are that measurement turns out to be noisier than
hoped, that one engineer is one engineer, and that a studio has to open on a date regardless of what the
software is doing.

The architecture is therefore chosen to be boring and portable, so that engineering effort goes into the
two things that actually differentiate the business: a companion app whose pain-relief and progress
claims are backed by a measurement dataset that can be trusted, and a coach console fast enough that
coaches use it willingly.

Everything else in this document is negotiable. Those two are not.

---

*Marn — Technical and Product Blueprint · Version 0.1 · August 2026*
*Open items are marked **OPEN** throughout. Sections 8 and 14.3 require review by UAE-qualified counsel
before the first real member record exists.*
