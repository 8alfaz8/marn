'use client';
import { colorOf, clamp } from '@/lib/reference';

/* ---------------------------------------------------------------------------
   The goniometer is the instrument a physiotherapist uses to measure joint
   angle. Borrowing its face — a swept arc with degree ticks — is the one
   signature element of this product's visual language. Everything numeric
   renders through it.
--------------------------------------------------------------------------- */

export function Gonio({ pct, size = 160, label, sub, color }: {
  pct: number; size?: number; label: string | number; sub: string; color?: string;
}) {
  const R = size / 2 - 11, C = size / 2, SW = Math.max(7, size * 0.055);
  const SPAN = 250, START = 145;
  const pt = (a: number, r: number) => [C + r * Math.cos((a * Math.PI) / 180), C + r * Math.sin((a * Math.PI) / 180)];
  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = pt(from, r), [x2, y2] = pt(to, r);
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const v = clamp(pct, 0, 1);
  const stroke = color || colorOf(v);
  const ticks = [...Array(11)].map((_, i) => {
    const a = START + SPAN * (i / 10);
    const [x1, y1] = pt(a, R + SW / 2 + 3);
    const [x2, y2] = pt(a, R + SW / 2 + (i % 5 === 0 ? 9 : 5));
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`rgba(237,235,226,${i % 5 === 0 ? 0.4 : 0.2})`} strokeWidth={1} />;
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ display: 'block', maxWidth: size, margin: '0 auto' }}
         role="img" aria-label={`${sub} ${label}`}>
      {ticks}
      <path d={arc(START, START + SPAN, R)} fill="none" stroke="rgba(237,235,226,.11)" strokeWidth={SW} />
      <path d={arc(START, START + SPAN * Math.max(v, 0.004), R)} fill="none" stroke={stroke} strokeWidth={SW} />
      <text x={C} y={C + size * 0.055} textAnchor="middle" fontFamily="Bricolage Grotesque,serif"
            fontWeight="800" fontSize={size * 0.3} fill="#EDEBE2" letterSpacing="-2">{label}</text>
      <text x={C} y={C + size * 0.2} textAnchor="middle" fontFamily="JetBrains Mono,monospace"
            fontSize={size * 0.055} letterSpacing="2" fill="#8F9683">{sub}</text>
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   Body map.

   Hand-plotted cubic-Bézier silhouettes in the 200 × 320 coordinate space
   below, redrawn against a real reference photo (a labelled front/back
   muscle-diagram illustration) for proportion and shape — not traced or
   embedded, since that image reads as licensed stock art. Still not
   commissioned anatomical art — the blueprint (§4.1.2, OPEN) parks that as a
   design task. The bar this clears is "a body with an athletic taper and
   bulging muscle bellies," not photorealism.

   Landmarks: head 16–61, neck 60–76, shoulder span 60–140 at y≈90–100 (widest
   torso point sits just below the shoulder cap, matching lat/deltoid width,
   not the collarbone line), waist narrows to 83–117 at y≈150, hips flare back
   out to 70–130 at y≈175, thighs bulge widest ≈y215, knee ≈y252, calf bulge
   ≈y288, ankle ≈y302. Centre line x = 100; bilateral pairs mirror x' = 200−x.
--------------------------------------------------------------------------- */

/* Non-interactive, unfilled backdrop the regions sit on top of. */
const OUTLINE: string[] = [
  // head
  'M100,16 C112,16 120,26 120,39 C120,52 112,61 100,61 C88,61 80,52 80,39 C80,26 88,16 100,16 Z',
  // torso: neck through the V-taper to the waist, then the hip flare
  'M109,60 C109,68 115,68 115,76 C115,83 140,83 140,90 C140,95 138,95 138,100 '
    + 'C138,112.5 130,112.5 130,125 C130,137.5 117,137.5 117,150 C117,162.5 130,162.5 130,175 '
    + 'C130,185 114,185 114,195 L86,195 C86,185 70,185 70,175 C70,162.5 83,162.5 83,150 '
    + 'C83,137.5 70,137.5 70,125 C70,112.5 62,112.5 62,100 C62,95 60,95 60,90 '
    + 'C60,83 85,83 85,76 C85,68 91,68 91,60 Z',
  // arms, bicep bulge above a tapered forearm
  'M142,88 C147,96 150,104 150,112 C150,122 148,132 146,140 C144,150 140,159 138,168 '
    + 'C136,178 135,187 134,195 C133,201 131,208 130,213 L121,211 C122,204 124,196 125,188 '
    + 'C126,180 128,172 129,163 C128,152 127,141 126,130 C125,120 123,110 122,100 C124,96 133,91 142,88 Z',
  'M58,88 C53,96 50,104 50,112 C50,122 52,132 54,140 C56,150 60,159 62,168 '
    + 'C64,178 65,187 66,195 C67,201 69,208 70,213 L79,211 C78,204 76,196 75,188 '
    + 'C74,180 72,172 71,163 C72,152 73,141 74,130 C75,120 77,110 78,100 C76,96 67,91 58,88 Z',
  // legs, thigh bulge, tapered knee, calf bulge, ankle
  'M116,196 C120,196 125,197 128,200 C132,208 134,215 133,222 C132,232 129,242 127,252 '
    + 'C126,258 126,264 127,270 C130,276 132,282 131,288 C130,294 126,299 122,303 '
    + 'C121,305 120,307 119,308 L104,308 C103,306 102,304 102,302 C99,298 98,293 99,288 '
    + 'C100,282 102,276 104,270 C103,264 102,258 101,252 C100,242 98,232 99,222 '
    + 'C99,214 102,207 106,200 C109,197 112,196 116,196 Z',
  'M84,196 C80,196 75,197 72,200 C68,208 66,215 67,222 C68,232 71,242 73,252 '
    + 'C74,258 74,264 73,270 C70,276 68,282 69,288 C70,294 74,299 78,303 '
    + 'C79,305 80,307 81,308 L96,308 C97,306 98,304 98,302 C101,298 102,293 101,288 '
    + 'C100,282 98,276 96,270 C97,264 98,258 99,252 C100,242 102,232 101,222 '
    + 'C101,214 98,207 94,200 C91,197 88,196 84,196 Z',
];

const NECK = 'M91,60 L109,60 C109,66 108,71 105,76 C102,78 98,78 95,76 C92,71 91,66 91,60 Z';
const DELTOIDS = [
  'M115,76 C126,79 137,85 140,96 C143,107 140,116 133,121 C126,118 121,111 118,101 C116,92 115,84 115,76 Z',
  'M85,76 C74,79 63,85 60,96 C57,107 60,116 67,121 C74,118 79,111 82,101 C84,92 85,84 85,76 Z',
];

const FRONT: Record<string, string[]> = {
  neck: [NECK],
  shoulders: DELTOIDS,
  // two rounded pec shells either side of the sternum
  chest: [
    'M101,90 C108,88 116,90 120,96 C124,103 124,113 119,120 C113,126 105,125 101,120 C100,111 100,100 101,90 Z',
    'M99,90 C92,88 84,90 80,96 C76,103 76,113 81,120 C87,126 95,125 99,120 C100,111 100,100 99,90 Z',
  ],
  // band across the hip crease, sitting right at the thigh junction
  hip_flexors: [
    'M75,184 C87,179 113,179 125,184 C128,190 128,198 125,204 C113,209 87,209 75,204 C72,198 72,190 75,184 Z',
  ],
  // thigh bulge tapering into the knee
  quadriceps: [
    'M105,202 C110,198 118,199 122,206 C126,218 127,234 124,248 C122,256 118,260 113,259 C109,258 107,252 106,244 C104,230 104,214 105,202 Z',
    'M95,202 C90,198 82,199 78,206 C74,218 73,234 76,248 C78,256 82,260 87,259 C91,258 93,252 94,244 C96,230 96,214 95,202 Z',
  ],
};

const BACK: Record<string, string[]> = {
  neck: [NECK],
  shoulders: DELTOIDS,
  // trapezius kite across the upper back
  thoracic: [
    'M100,76 C87,79 74,86 68,98 C73,112 82,126 100,140 C118,126 127,112 132,98 C126,86 113,79 100,76 Z',
  ],
  // lumbar band
  lower_back: [
    'M78,140 C88,135 112,135 122,140 C126,150 126,164 122,172 C112,177 88,177 78,172 C74,164 74,150 78,140 Z',
  ],
  // rounded seat band matching the hip flare
  glutes: [
    'M70,175 C78,166 92,162 100,162 C108,162 122,166 130,175 C134,186 131,198 122,204 C112,209 88,209 78,204 C69,198 66,186 70,175 Z',
  ],
  // same leg geometry as the front thigh — a flat two-view figure, not a 3D model
  hamstrings: [
    'M105,202 C110,198 118,199 122,206 C126,218 127,234 124,248 C122,256 118,260 113,259 C109,258 107,252 106,244 C104,230 104,214 105,202 Z',
    'M95,202 C90,198 82,199 78,206 C74,218 73,234 76,248 C78,256 82,260 87,259 C91,258 93,252 94,244 C96,230 96,214 95,202 Z',
  ],
  // calf bulge tapering into the ankle
  calves: [
    'M104,258 C100,268 99,282 101,294 C102,300 105,303 108,302 C111,301 113,296 114,289 C116,278 117,265 116,258 C112,254 107,254 104,258 Z',
    'M96,258 C100,268 101,282 99,294 C98,300 95,303 92,302 C89,301 87,296 86,289 C84,278 83,265 84,258 C88,254 93,254 96,258 Z',
  ],
};

export function BodyMap({ face, measurements, selected, onSelect }: {
  face: 'front' | 'back'; measurements: any[]; selected: string; onSelect: (k: string) => void;
}) {
  const map = face === 'front' ? FRONT : BACK;
  const pctOf = (k: string) => {
    const m = measurements.find((x) => x.muscleKey === k);
    return m ? m.degrees / m.target : null;
  };
  return (
    <svg viewBox="0 0 200 320" width="100%" style={{ display: 'block', maxHeight: 330, margin: '0 auto' }}>
      <g stroke="rgba(237,235,226,.42)" fill="rgba(237,235,226,.09)" strokeWidth={1.4} pointerEvents="none">
        {OUTLINE.map((d, i) => <path key={i} d={d} />)}
      </g>
      {Object.entries(map).map(([k, paths]) => {
        const p = pctOf(k);
        const fill = p === null ? 'rgba(237,235,226,.10)' : colorOf(p);
        return paths.map((d, i) => (
          <path key={k + i} d={d} fill={fill} fillOpacity={selected === k ? 0.95 : 0.62}
                stroke={selected === k ? '#EDEBE2' : 'rgba(16,19,14,.45)'} strokeWidth={selected === k ? 1.6 : 1}
                style={{ cursor: 'pointer' }} onClick={() => onSelect(k)}>
            <title>{k}</title>
          </path>
        ));
      })}
    </svg>
  );
}
