# 0006 — Reposition as a companion app for pain relief and rehab

**Status:** Accepted
**Date:** 2026-08-10

## Context

The blueprint's original business thesis (§1.1–1.2, v0.1) framed Marn as "a
recovery studio business whose actual product is a measurement dataset" —
measurement was named as *the product*, with the studio as delivery
mechanism and the app as the interface to that dataset.

The product owner corrected this: Marn is a **companion app for physical
rehab and pain relief**. The app is the primary relationship a member has
with the product; the studio is where the physical work happens; the main
selling point is pain relief and rehab, not the measurement itself.

This creates a real tension with §1.5 of the same blueprint ("Positioning —
and the word we do not use"), which deliberately avoids clinical/rehab
framing specifically to stay outside Dubai Health Authority clinic
licensing — a licensed facility, licensed physiotherapists instead of
trained flexologists, and a different insurance and record-keeping regime.
"Rehab" and "pain relief" as the headline sell sit close to that line.

## Decision

Sell the outcome, keep the guardrails. Pain relief and rehab are now the
lead marketing/positioning language — that's the point of the product. What
does **not** change: the non-clinical vocabulary rules in §1.5 stay exactly
as written (coaches not therapists, assessments/observations not
diagnoses/treatment plans, a referral gate not a liability form, scores as
fitness metrics). We describe *measured change* ("hip flexion up 9°,
reported pain down from 6 to 3"), never a diagnosis, treatment plan, or
promise to cure. Selling the outcome and staying out of clinical language
are treated as compatible, not in tension — the copy does the first without
doing the second.

Measurement is reframed from "the product" to "the proof": it's what makes
the pain-relief and progress claims trustworthy rather than anecdotal, and
it's still the thing that drives retention, referral, and the enterprise
pitch (blueprint §2.3, retitled "Why tracked progress is the wedge"). That
supporting argument didn't change — only what it's in service of did.

## Consequences

- Updated the blueprint's executive summary (§1.1, §1.2), §1.5's intro, §2.1,
  §2.3's heading, and the closing note — the passages that stated or implied
  "measurement is the product." Left the engineering chapters (Parts
  Three–Six: schema, scoring, API, roadmap) untouched; nothing about *how*
  the system is built changed, only what it's positioned as being for.
- Updated `CLAUDE.md`'s and `AGENTS.md`'s opening thesis lines to match.
- If this repositioning later needs to go further — e.g., marketing copy
  that starts to sound like a treatment claim, or a push toward clinical
  outcomes reporting — that's the "go fully clinical/rehab" fork this ADR
  explicitly did *not* take, and it would mean revisiting DHA licensing,
  same as blueprint §1.5 already lays out. Not a decision to make silently
  in a copy change.
- `docs/design/design-system.md` and `docs/design/journeys.md` were not
  touched — the former is visual/component tokens (due for a rewrite anyway
  once the new brand design system lands), the latter documents the frozen
  prototype's actual behavior, not the business thesis.
