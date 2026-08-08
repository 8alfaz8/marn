# API surface

All routes live under `/api`. Implemented by the dispatcher in `app/api/[...path]/route.ts`.
JSON in, JSON out. Errors return `{ error: string }` with a meaningful status.

Split this into per-resource route modules once the shape stops moving — the paths won't change.

## Read

| Method | Path | Returns |
|---|---|---|
| `GET` | `/snapshot` | Whole dataset plus computed scores. Polled every 5s by the client. Paginate before this is production. |
| `GET` | `/availability?date=&serviceId=` | 30- or 60-minute slots for the day, each marked busy or free |
| `GET` | `/members/:id` | Member, latest assessment and measurements, priority areas, sessions, programmes, flags |
| `GET` | `/admin/tables` | Raw rows per table, for the database panel |

## Members and coaches

| Method | Path | Notes |
|---|---|---|
| `POST` | `/members` | `{name, phone, goal, parqCleared}`. Auto-raises a PAR-Q flag when not cleared |
| `POST` | `/coaches` | `{name, title}` |
| `POST` | `/members/:id/parq` | `{cleared}`. Clearing removes the PAR-Q flag and unblocks booking |
| `POST` | `/members/:id/flags` | `{text}`. Contraindications and safety notes |
| `DELETE` | `/members/:id/flags/:flagId` | |
| `POST` | `/members/:id/wearable` | `{provider}`. Recomputes today's recovery score |

## Bookings

| Method | Path | Notes |
|---|---|---|
| `POST` | `/bookings` | `{memberId, serviceId, date, time, addons}`. **409** if PAR-Q outstanding or the slot is taken. Created as `requested` |
| `POST` | `/bookings/:id/confirm` | `{coachId}` → `confirmed`, member notified |
| `POST` | `/bookings/:id/decline` | `{reason}` → `cancelled` |
| `DELETE` | `/bookings/:id` | Member-side cancel |

Status flow: `requested → confirmed → completed`, with `cancelled` reachable from the first two.

## Assessments

| Method | Path | Notes |
|---|---|---|
| `POST` | `/integrations/bodymap/import` | `{memberId, coachId}`. Goes through the adapter. Currently simulated |
| `POST` | `/members/:id/assessments` | `{coachId, measurements:[{key,value}]}`. Manual coach entry — always available, including offline |

Both write one `assessments` row and ten `measurements` rows, then recompute today's scores.
Unknown muscle keys are dropped rather than guessed.

## Sessions, programmes, check-ins

| Method | Path | Notes |
|---|---|---|
| `POST` | `/sessions` | Full session record. **422** without a member-facing summary — that field is the product, not paperwork. Decrements credits, increments streak, closes the booking |
| `POST` | `/members/:id/programs` | `{title, moves}` |
| `POST` | `/programs/:id/complete` | Idempotent per day. Feeds adherence, which feeds recovery |
| `POST` | `/checkins` | `{memberId, sleep, pain, areas, note}`. Pre-session intake the coach sees before arrival |

## Admin

| Method | Path | Notes |
|---|---|---|
| `POST` | `/admin/seed` | Wipes and re-seeds. **Remove before this touches real data** |

## Not yet built

Authentication and sessions; payments and the credit ledger as double-entry; WhatsApp and push
delivery (currently just a `notified` array in the response); corporate accounts and pooled credits;
waitlist and short-notice capacity fill; offline capture and sync for pod sites.
