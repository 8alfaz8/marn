# 0004 — Body map SVG built from a ported MIT-licensed dataset, not hand-drawn

**Status:** Accepted
**Date:** 2026-08-10

## Context

`components/Viz.tsx`'s `BodyMap` was hand-authored as raw cubic-Bézier `d` path
strings, typed directly and iterated by screenshotting a running browser. It
reads as a body but stays visibly faceted/blobby — no shape a professional
illustrator would ship. The user asked directly whether the *approach* was the
reason further iteration wasn't closing the gap to a reference pain-map image
they'd seen elsewhere.

It was. Hand-typing bezier coordinates via text has a real quality ceiling:
there's no tangent/curve-continuity feedback the way a human dragging handles
in a vector tool gets, so each iteration plateaus near where it already is
rather than approaching illustrator-tracing quality. The reference image the
user shared is almost certainly a licensed stock/commercial pain-map asset —
the same concern this file's own comments already flagged before this change
("not traced or embedded, since that image reads as licensed stock art").

## Decision

Ported the SVG polygon *data* (not the package) from
[`react-body-highlighter`](https://github.com/giavinh79/react-body-highlighter),
MIT licensed (`Copyright (c) 2020 GV79`, confirmed by fetching `LICENSE`
directly). MIT permits commercial, closed-source modification and
redistribution; the only obligation is retaining the copyright/permission
notice, which lives in full at the top of `components/bodyMapData.ts`.

This is a ported dataset, not a live package dependency — nothing was added to
`package.json`. `components/bodyMapData.ts` holds the raw
`Record<string, string[]>` polygon-point maps (anterior/posterior), flattened
out of the upstream package's exercise-tracking wrapper, which we don't need.
`BodyMap`'s external contract (`{ face, measurements, selected, onSelect }`)
is unchanged, so every caller (Member.tsx, Coach.tsx, Admin.tsx) needed zero
changes.

Two pragmatic mapping calls, made to avoid introducing any new hand-drawn
geometry (the exact thing being moved away from):

- **`hip_flexors`** has no matching region in the source set. Mapped to the
  closest available polygon, `abductors` (upper-inner-thigh, anterior) — a
  spatial proxy, not an anatomical claim. Cheap to swap if a better source
  region is found later.
- **`neck`** only lights up on the front view. The source has no posterior
  neck polygon (trapezius abuts the head directly there); the old hand-drawn
  version faked one shape for both views. This narrows neck to its canonical
  `face: 'front'` already declared in `lib/reference.ts`'s `MUSCLES`, so it's
  a simplification toward the existing data model, not away from it.

The source's own declared `viewBox="0 0 100 200"` clips the last ~20 units of
the posterior calf/soleus polygons (verified by computing the actual point
bounds: y reaches 220, not 200). Marn's `BodyMap` uses `viewBox="0 0 100 220"`
to fix that clipping rather than reproduce it.

Every polygon in the dataset renders — the ~10 Marn `MUSCLES` keys stay
interactive and colour-by-status; everything else (abs, obliques, biceps,
forearm, head, knees, trapezius, etc.) is a static, non-interactive backdrop.
This keeps the "always reads as a whole body" requirement without hand-drawing
a silhouette — confirmed against the upstream package's own example render.

## Consequences

- No side views. None of the SVG libraries researched (react-body-highlighter,
  body-highlighter, body-muscles) include a side view; adding one would still
  mean hand-drawing it — the exact quality ceiling this decision moves away
  from — and would need a `face` type change beyond today's
  `'front' | 'back'`. Out of scope for this pass.
- `hip_flexors` and `neck` (back view) are spatial approximations, not
  anatomically exact regions — flagged above and visible in the mapping table
  in `components/Viz.tsx`'s top comment. Revisit if a closer-fitting free
  asset turns up, or when real commissioned art (already parked as a
  blueprint OPEN item, §4.1.2) replaces this pass entirely.
- If the upstream repo's license or content ever changes, it doesn't affect
  Marn — the data is copied into `components/bodyMapData.ts`, not fetched or
  imported live.
