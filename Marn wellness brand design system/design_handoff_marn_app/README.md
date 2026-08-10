# Handoff: Marn — brand system + member app

## Overview
Marn is an assisted-stretching and recovery service delivered one-to-one in Dubai studios. This bundle covers the brand system (colour, type, space, shape, motif, ambient wash) and five member-app screens: Today (home), Session detail, Mobility detail, Session report, and Progress.

The product promise is an outcome you can feel — less pain, more range. Copy is outcome language (hold quality, ease, range), never diagnostic or clinical. There is no anatomy, cross, pulse-line or spine iconography anywhere in the system.

## About the design files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behaviour, not production code to copy. Recreate them in the target codebase's existing environment (React Native / SwiftUI / React, whatever the app is) using its established patterns, component library and theming layer. If no environment exists yet, choose the framework appropriate to the platform and implement there.

`Marn Design System.dc.html` uses a small in-house runtime (`support.js`) for templating and an iPhone frame component (`ios-frame.jsx`) purely to present the mocks. Neither is part of the design — ignore both when implementing; the device bezel is presentation chrome, not UI.

## Fidelity
**High fidelity.** Colours, type sizes, spacing, radii, shadows and copy are final and should be matched exactly. The one open item is the **logo mark** — the client is producing it separately. The document shows four candidate directions (Hinge, Arcade, Aperture, Orbit) with Arcade applied as a placeholder. Treat the mark as a swappable asset: reserve a square slot, do not hard-code the SVG paths into components.

---

## Design tokens

### Colour — dark (default; the app is dark-first)

| Token | Hex | Use | Contrast on background |
|---|---|---|---|
| `background` | `#0C1210` | App canvas, nav bar base | — |
| `surface` | `#141C19` | Cards, list rows, modals | — |
| `surfaceRaised` | `#1D2724` | Chips, segmented controls, nested cards, selected panels | — |
| `line` | `#2A3733` | Hairline borders, dividers, input outlines | non-text |
| `lineStrong` | `#3A4A44` | Border on floating (level 2) surfaces | non-text |
| `textPrimary` | `#F0EFE9` | Headlines, body, readouts | 16.6 : 1 AAA |
| `textSecondary` | `#A6B0AB` | Supporting copy, labels | 8.4 : 1 AAA |
| `textMuted` | `#7A8781` | Overlines, metadata, disabled | 5.0 : 1 AA |
| `primary` | `#C8A46A` | Brass. Mark, primary button fill, active tab, focus ring | 8.1 : 1 AAA |
| `primaryHover` | `#DDBB86` | Primary button hover/press | — |
| `secondary` | `#8FCBB8` | Celadon. Data highlights, links on dark, Excellent band | 10.3 : 1 AAA |

### Colour — light (web, email, print)

| Token | Hex |
|---|---|
| `background` | `#EFECE2` |
| `surface` | `#F9F7F0` |
| `line` | `#DED9C9` |
| `textPrimary` | `#101614` |
| `textSecondary` | `#5A635E` |
| `primary` | `#6E5220` (bronze — brass fails contrast on light) |
| `secondary` | `#1F6152` |

### Status bands
Four states on a journey, not a triage. Ramp: stone → ochre → jade → celadon. Nothing in the set is red; green sits in the middle, not at the top, so no band reads as an alarm or an all-clear.

| Band | Dark | Light | Meaning |
|---|---|---|---|
| Restricted | `#8B9691` (6.2:1) | `#5C6663` | Starting out; the quietest colour in the set |
| Limited | `#A97C42` (5.0:1) | `#6B4C1C` | Movement returning |
| Optimal | `#6FA98D` (6.9:1) | `#245A46` | Everyday target range |
| Excellent | `#8FCBB8` (10.3:1) | `#1F6152` | Beyond target; wears the accent as the reward |

### Ambient wash
Every screen carries one soft leak of colour from the top edge, fading out by roughly a quarter of the screen height. It is atmosphere, not information: nothing that must be read sits on it, and everything below stays on flat `background` at full contrast. The hue is tied to the tab, so moving across the tab bar cross-fades the room rather than repainting the UI.

```css
/* layered over #0C1210 */
today:    radial-gradient(130% 44% at 18% -8%, rgba(200,164,106,.20) 0%, rgba(200,164,106,0) 62%),
          radial-gradient(95% 30% at 92% 0%, rgba(143,203,184,.10) 0%, rgba(143,203,184,0) 66%);
progress: radial-gradient(130% 44% at 20% -8%, rgba(143,203,184,.20) 0%, rgba(143,203,184,0) 62%),
          radial-gradient(95% 30% at 95% 0%, rgba(200,164,106,.10) 0%, rgba(200,164,106,0) 66%);
sessions: radial-gradient(130% 44% at 22% -8%, rgba(111,169,141,.18) 0%, rgba(111,169,141,0) 62%),
          radial-gradient(95% 30% at 95% 0%, rgba(200,164,106,.10) 0%, rgba(200,164,106,0) 66%);
```
Transition `background 420ms ease` on tab change. On platforms without CSS gradients, render as a single blurred radial layer behind the scroll view; do not let it scroll with content and do not exceed ~28% of screen height.

### Typography
Two families, three roles. Both on Google Fonts, free to embed.

- **Petrona** (serif) — display: headlines, wordmark, pull quotes. Weights 300/400/500, italic 400.
- **Figtree** (sans) — UI and body. Weights 400/500/600/700.
- **Numerals** — Figtree 600 with `font-variant-numeric: tabular-nums` set globally. No third family; no monospace anywhere.

| Style | Font | Size / line | Tracking | Mobile |
|---|---|---|---|---|
| h1 | Petrona 400 | 64 / 66 | -0.02em | 40 / 44 |
| h2 | Petrona 400 | 44 / 50 | -0.015em | 32 / 38 |
| h3 | Petrona 400 | 30 / 38 | 0 | 26 / 32 |
| h4 | Figtree 600 | 22 / 28 | -0.01em | — |
| h5 | Figtree 600 | 18 / 24 | 0 | — |
| h6 | Figtree 600 | 16 / 22 | 0 | — |
| body1 | Figtree 400 | 16 / 26 | 0 | — |
| body2 | Figtree 400 | 14 / 22 | 0 | — |
| overline | Figtree 600 | 11 / 14 | +0.16em, uppercase | — |
| readout | Figtree 600 tabular | 60 / 60 | -0.02em | unit (°) in `primary` |

Arabic: pair Petrona with Noto Naskh Arabic for display and Figtree with IBM Plex Sans Arabic for UI; figures stay Figtree tabular in both directions. Layout must survive RTL mirroring.

### Space
8 px base unit; every gap, pad and inset is a multiple. Scale: 4 / 8 / 16 / 24 / 32 / 48 / 64 / 96.
Screen gutter 24 (mobile) / 40 (web). Card padding 20–24. Vertical gap between unrelated blocks 32. Minimum hit target 44 px.

### Radius
`sm 12` inputs and chips · `md 18` default · `lg 24` sheets and hero cards · `pill 999` buttons, tags, the range track. Nothing in the product is sharper than 12.

### Elevation
Three levels. Selection is never carried by colour alone — a selected panel moves three things at once.

```
level 0 — resting:  background: surface;        border: 1px solid #2A3733;  no shadow
level 1 — selected: background: surfaceRaised;  border: 1px solid rgba(200,164,106,.55);
                    box-shadow: inset 0 1px 0 rgba(240,239,233,.08),
                                0 0 0 3px rgba(200,164,106,.12),
                                0 10px 24px rgba(0,0,0,.55);
level 2 — floating: background: surfaceRaised;  border: 1px solid #3A4A44;
                    box-shadow: inset 0 1px 0 rgba(240,239,233,.06),
                                0 2px 6px rgba(0,0,0,.4),
                                0 24px 60px rgba(0,0,0,.7);
```
Level 2 is only for things that genuinely float: bottom sheets, menus, the booking bar.

### Motif — the opening arc
One device at four scales: a pivot with a sweep that widens as range improves. Sweep runs 40° at zero to 250° at full. Round caps both ends. Track is `surfaceRaised`, never empty black. Applications: progress ring, avatar rim (member and therapist photos carry the current band on the rim), ripple streak (sessions in blocks of six, most recent at full strength), flattened arc (the same sweep unrolled as a horizontal bar for joint-by-joint comparison), and a shallow arc replacing the straight divider on marketing pages.

---

## Screens

All five are 390 × 844 (iPhone 14/15 class). Status-bar safe area is 54–56 px; content starts below it. Tab bar is fixed at the bottom, `border-top: 1px solid #2A3733`, `background: rgba(12,18,16,.86)` with a 12 px backdrop blur so the wash reads behind it. Three tabs: Today, Progress, Sessions. Active tab: label and glyph in `primary`, weight 600, wrapped in a `surfaceRaised` pill at radius 14 with the level-1 selected treatment.

### 1. Today (home) — tab: Today, wash: brass
- Header row: overline `Wednesday` (textMuted), Petrona 30/1.1 greeting `Good morning,\nYasmin`; 44 px circular avatar on the right (`surfaceRaised`, 1px `line`, Petrona initial in textSecondary).
- Hero card (radius 24, level 0, padding 24): 104 px progress ring on the left — track `surfaceRaised` 9 px, value stroke in the current band colour, rotated -146° so the gap sits at the bottom; centred readout `68` + `°` in primary. Right side: band overline in the band colour (`OPTIMAL`), h5 joint name `Hip flexion`, body2 `Up 6° since your first session`.
- Three stat tiles in a row (flex 1 each, radius 18, level 0, padding 16/18): `12 sessions`, `2.4 pain, avg`, and a four-dot ripple streak (`this week`).
- Overline `Next in the studio`, then a booking row card: 48 px date tile (`14 / AUG`), h6 `Lower body, 50 min`, body2 `Layla · Al Quoz studio · 18:30`.
- Action row: primary pill button `Log today` (brass fill, `#0C1210` label, 15/600, padding 15×20, hover `#DDBB86`) and a secondary outlined pill `Book`.

### 2. Session detail — tab: Sessions, wash: jade
- Overline `Session 12 · 4 Aug`, Petrona 30 title `Shoulder & thoracic`.
- Filter chips (pill, 9×16): `Range` selected (brass fill, dark label), `Pain` and `Notes` resting (surface + hairline).
- Measures card (radius 24): readout `142°` with an `EXCELLENT` band pill on the right; three labelled bars below — Flexion 142° (88%, Excellent), Abduction 118° (66%, Optimal), External rotation 54° (40%, Limited). Bar track `surfaceRaised`, 8 px, pill radius.
- Therapist note card: 36 px avatar, name `Layla` / `Your therapist`, body2 note.
- Footer row: `Compare with session 11` and `+8°` in the Optimal colour.

### 3. Mobility detail — tab: Sessions, wash: jade
Back and overflow buttons (38 px circles, surface + hairline) in the header. Section `Mobility detail`.
- Two gauge cards side by side: `Symmetry 0.94 / EVEN` (Optimal arc) and `Ease 8.2 / RELAXED` (Excellent arc), 96 px rings rotated -125°, info dot top-right of each.
- Two range cards: `Hold quality 1.48 / STEADY` with a normal-band segment marker (1.41–1.55), and `Held tension 10.7% / WATCH` with a value handle on the track (0–5%).
- `Session trace`: dual polyline chart, 118 px tall, two hairline gridlines in `surfaceRaised`; Range line in celadon, Comfort line in brass, 2 px, round joins. Legend below. Scale label `54–142°` in the Limited colour.

### 4. Session report — tab: Sessions, wash: jade
- Overline `Sunday, 24 August · 11:13`, Petrona 32 `Full body reset`, two meta pills (`Al Quoz studio`, `50 min`).
- `Time in band` (subhead `vs your last four sessions`): four rows, each `82px label | flexible bar | 34px % | 52px duration`. Restricted 8% 4:02, Limited 22% 11:04, Optimal 53% 26:31, Excellent 17% 8:23. Bars 14 px, band-coloured, on a `surfaceRaised` track. The dominant row's label is `textPrimary`, the rest `textSecondary`.
- `By joint` table with a `deg / gain` segmented toggle (selected segment gets the level-1 treatment). Columns `Joint | Range | Pain | Change`, rows separated by 1 px `surface`. Range figures are tinted by their band; positive change in Optimal green, negative in brass. Rows: Hip flexion 128° 1.5 +6, Hamstring 78° 3.0 +4, Shoulder flex. 142° 0.5 +8, Ext. rotation 54° 2.5 −1, Ankle dorsi. 22° 4.0 +2.

### 5. Progress — tab: Progress, wash: celadon
- Overline `Twelve weeks`, Petrona 30 `Hip flexion is your fastest gain`.
- Trend card (radius 22): readout `+22°`, pill `SINCE MAY`; 130 px area chart, brass line 2.5 px with a 9% brass fill and a 4.5 px end dot; three gridlines; month axis MAY–AUG.
- Three stat tiles: `31 sessions logged`, `−2.1 avg pain change`, `9 week streak`.
- `Consistency`: 12-cell grid, square cells at radius 5, brass at 35/55/75/100% opacity for intensity, `surfaceRaised` for a missed week. Axis `WEEK 1` → `WEEK 12`.

---

## Interactions & behaviour
- **Tab change**: cross-fade the ambient wash, `background 420ms ease`. Content transition is a standard platform push/fade; no custom easing.
- **Progress ring**: animates from 0 to value on screen entry, 700 ms, ease-out; the band colour cross-fades at 350 ms when a value crosses a threshold. Numerals count up with tabular figures so the readout never reflows.
- **Chips and segmented controls**: tap moves the level-1 selected treatment; no colour-only change.
- **Buttons**: primary hover/press `#DDBB86`; secondary hover fills with `surface`. Focus ring is a 2 px brass outline at 2 px offset.
- **Bars and bands**: bars grow from the leading edge, 500 ms ease-out, staggered 60 ms per row.
- **Empty states**: a member with no sessions sees the ring at track-only with the copy `Your first session sets the baseline` — never a zero readout.
- **Responsive**: single column throughout; the two-up gauge cards stack below 360 px.

## State
- `activeTab: 'today' | 'progress' | 'sessions'` — drives the ambient wash hue and the tab pill.
- `member` — name, avatar, streak, session count, average pain.
- `sessions[]` — date, studio, therapist, duration, per-joint measures (range, pain, change), time-in-band breakdown, trace series, therapist note.
- `focusJoint` — which joint the hero ring and the trend chart are showing.
- `unit: 'deg' | 'gain'` — the By joint table toggle.
- Band assignment is derived, never stored: `< 35 Restricted`, `< 60 Limited`, `< 80 Optimal`, `>= 80 Excellent` on the joint's normalised 0–100 range score.

## Assets
- Fonts: Petrona and Figtree from Google Fonts — `https://fonts.googleapis.com/css2?family=Petrona:ital,wght@0,300..500;1,400&family=Figtree:wght@400..700&display=swap`.
- Logo: **not final.** Four candidate marks are drawn as inline SVG in the design system file, section 01, with Arcade applied as a placeholder. Wire the mark as a single swappable asset.
- Icons: the tab bar and inline icons in the mocks are placeholder glyphs. Use the codebase's existing icon set, stroke style, 1.5–2 px weight, round caps to match the motif.
- No photography in the app. If marketing photography is introduced, the mark always sits on a scrim.

## Files
- `Marn Design System.dc.html` — the full system: logo candidates, colour, ambient wash, typography, space and shape, motif, five app screens, and a JSON token block at the end (section 08) ready to paste into a theme file.
- `Marn Session Report.dc.html` — a standalone session-report exploration.
- `ios-frame.jsx`, `support.js` — presentation scaffolding for the HTML mocks only. Not part of the design.
