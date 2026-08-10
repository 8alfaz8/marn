'use client';
import { useTheme } from '@mui/material/styles';
import { colorOf, clamp } from '@/lib/reference';

/* ---------------------------------------------------------------------------
   The opening arc — one device at four scales (per the brand handoff's
   "Motif" section): a pivot with a sweep that widens as range improves.
   Round caps, track never empty black. This component is the ring/gauge
   primitive reused across the brand screens (Today's hero ring, Mobility
   detail's Symmetry/Ease gauges) since MUI has no ring/gauge component —
   inline SVG is the deliberate choice, not a re-implemented MUI component,
   this is data visualisation.
--------------------------------------------------------------------------- */

export function Gonio({ pct, size = 160, label, sub, color }: {
  pct: number; size?: number; label: string | number; sub: string; color?: string;
}) {
  const theme = useTheme();
  const R = size / 2 - 11, C = size / 2, SW = Math.max(7, size * 0.055);
  const SPAN = 250, START = 145;
  const pt = (a: number, r: number) => [C + r * Math.cos((a * Math.PI) / 180), C + r * Math.sin((a * Math.PI) / 180)];
  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = pt(from, r), [x2, y2] = pt(to, r);
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const v = clamp(pct, 0, 1);
  const stroke = color || colorOf(v);
  const tickColor = theme.palette.text.primary;
  const ticks = [...Array(11)].map((_, i) => {
    const a = START + SPAN * (i / 10);
    const [x1, y1] = pt(a, R + SW / 2 + 3);
    const [x2, y2] = pt(a, R + SW / 2 + (i % 5 === 0 ? 9 : 5));
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={tickColor} strokeOpacity={i % 5 === 0 ? 0.4 : 0.2} strokeWidth={1} />;
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ display: 'block', maxWidth: size, margin: '0 auto' }}
         role="img" aria-label={`${sub} ${label}`}>
      {ticks}
      <path d={arc(START, START + SPAN, R)} fill="none" stroke={theme.palette.background.raised} strokeWidth={SW} />
      <path d={arc(START, START + SPAN * Math.max(v, 0.004), R)} fill="none" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <text x={C} y={C + size * 0.055} textAnchor="middle" fontFamily="var(--font-figtree),sans-serif"
            fontWeight={600} fontSize={size * 0.28} fill={theme.palette.text.primary} letterSpacing="-1">{label}</text>
      <text x={C} y={C + size * 0.2} textAnchor="middle" fontFamily="var(--font-figtree),sans-serif"
            fontWeight={600} fontSize={size * 0.055} letterSpacing="2" fill={theme.palette.text.disabled}>{sub}</text>
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   Body map.

   Polygon data ported from react-body-highlighter (MIT) — see
   components/bodyMapData.ts for the source/license and docs/adr/0004 for why:
   hand-plotted bezier curves (this component's previous approach) have a real
   quality ceiling for anatomical shapes, this doesn't. Still not commissioned
   anatomical art — the blueprint (§4.1.2, OPEN) parks that as a design task.

   Every polygon in the dataset renders, so the figure always reads as a whole
   body. Only the keys in MUSCLE_MAP are interactive/colour-by-status; the rest
   (abs, obliques, biceps, forearm, head, knees, …) are a static backdrop —
   same intent as the old unfilled OUTLINE, just built from real anatomy
   instead of one hand-drawn blob. Two of the ten Marn muscle groups don't have
   an exact match in the source set and use the closest available region
   instead of new hand-drawn geometry (see docs/adr/0004): hip_flexors uses the
   upper-inner-thigh "abductors" polygon, and neck only lights up on the front
   view (the source has no posterior neck facet — the trapezius polygon abuts
   the head directly there), which also matches neck's canonical `face: 'front'`
   in lib/reference.ts.
--------------------------------------------------------------------------- */

import { ANTERIOR, POSTERIOR } from './bodyMapData';

const FRONT_MAP: Record<string, string> = {
  chest: 'chest',
  hip_flexors: 'abductors',
  quadriceps: 'quadriceps',
  shoulders: 'front-deltoids',
  neck: 'neck',
};

const BACK_MAP: Record<string, string> = {
  shoulders: 'back-deltoids',
  lower_back: 'lower-back',
  thoracic: 'upper-back',
  glutes: 'gluteal',
  hamstrings: 'hamstring',
  calves: 'calves',
};

export function BodyMap({ face, measurements, selected, onSelect }: {
  face: 'front' | 'back'; measurements: any[]; selected: string; onSelect: (k: string) => void;
}) {
  const theme = useTheme();
  const source = face === 'front' ? ANTERIOR : POSTERIOR;
  const marnToSource = face === 'front' ? FRONT_MAP : BACK_MAP;
  const sourceToMarn = Object.fromEntries(Object.entries(marnToSource).map(([marn, src]) => [src, marn]));

  const pctOf = (k: string) => {
    const m = measurements.find((x) => x.muscleKey === k);
    return m ? m.degrees / m.target : null;
  };

  return (
    <svg viewBox="0 0 100 220" width="100%" style={{ display: 'block', maxHeight: 330, margin: '0 auto' }}>
      {Object.entries(source).map(([regionKey, polygons]) => {
        const marnKey = sourceToMarn[regionKey];
        if (!marnKey) {
          // Filler region: part of the anatomy, but not one of Marn's measured
          // muscle groups. Static backdrop so the figure reads as a whole body.
          return (
            <g key={regionKey} fill={theme.palette.background.raised} stroke={theme.palette.divider} strokeWidth={0.6} pointerEvents="none">
              {polygons.map((points, i) => <polygon key={i} points={points} />)}
            </g>
          );
        }
        const p = pctOf(marnKey);
        const fill = p === null ? theme.palette.background.raised : colorOf(p);
        const isSelected = selected === marnKey;
        return (
          <g key={regionKey} fill={fill} fillOpacity={isSelected ? 0.95 : 0.68}
             stroke={isSelected ? theme.palette.text.primary : theme.palette.background.default} strokeWidth={isSelected ? 1 : 0.6}
             style={{ cursor: 'pointer' }} onClick={() => onSelect(marnKey)}>
            <title>{marnKey}</title>
            {polygons.map((points, i) => <polygon key={i} points={points} />)}
          </g>
        );
      })}
    </svg>
  );
}
