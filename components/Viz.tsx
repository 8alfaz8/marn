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
   below. Not commissioned anatomical art — the blueprint (§4.1.2, OPEN) parks
   that as a design task. The bar this clears is "a body with shaped muscle
   regions" rather than the rectangles-on-a-stick-figure it replaces.

   Landmarks everything is plotted against: head 18–59, neck 56–74,
   shoulder line ~73, ribs ~120, waist ~146, hip crease ~176, knee ~250,
   ankle ~305. Centre line x = 100; bilateral pairs mirror as x' = 200 − x.
--------------------------------------------------------------------------- */

/* Non-interactive, unfilled backdrop the regions sit on top of. */
const OUTLINE: string[] = [
  // head
  'M100,18 C110,18 118,27 118,38 C118,50 110,59 100,59 C90,59 82,50 82,38 C82,27 90,18 100,18 Z',
  // neck, shoulders, torso taper to waist, hips
  'M92,57 C92,65 90,70 84,73 C75,76 69,81 68,90 C67,100 70,110 71,120 '
    + 'C72,132 77,138 78,146 C74,154 71,164 73,176 C76,187 85,192 100,192 '
    + 'C115,192 124,187 127,176 C129,164 126,154 122,146 C123,138 128,132 129,120 '
    + 'C130,110 133,100 132,90 C131,81 125,76 116,73 C110,70 108,65 108,57 Z',
  // arms
  'M68,88 C62,94 58,108 56,124 C54,140 52,152 51,164 C51,168 53,170 55,169 '
    + 'C58,168 59,164 60,158 C62,144 65,128 68,114 C70,104 71,95 71,90 Z',
  'M132,88 C138,94 142,108 144,124 C146,140 148,152 149,164 C149,168 147,170 145,169 '
    + 'C142,168 141,164 140,158 C138,144 135,128 132,114 C130,104 129,95 129,90 Z',
  // legs
  'M76,188 C72,206 71,228 74,246 C76,264 78,284 79,302 C79,306 80,308 82,308 '
    + 'L92,308 C93,304 93,300 93,296 C93,278 94,262 95,244 C96,224 97,206 98,190 Z',
  'M124,188 C128,206 129,228 126,246 C124,264 122,284 121,302 C121,306 120,308 118,308 '
    + 'L108,308 C107,304 107,300 107,296 C107,278 106,262 105,244 C104,224 103,206 102,190 Z',
];

const NECK = 'M92,56 C92,64 91,69 88,74 C94,77 106,77 112,74 C109,69 108,64 108,56 C103,59 97,59 92,56 Z';
const DELTOIDS = [
  'M84,73 C76,75 69,80 67,89 C65,98 67,106 71,111 C77,109 81,104 83,96 C84,88 84,79 84,73 Z',
  'M116,73 C124,75 131,80 133,89 C135,98 133,106 129,111 C123,109 119,104 117,96 C116,88 116,79 116,73 Z',
];

const FRONT: Record<string, string[]> = {
  neck: [NECK],
  shoulders: DELTOIDS,
  // two rounded pec shells either side of the sternum
  chest: [
    'M99,82 C93,80 87,81 84,85 C81,90 81,99 84,106 C88,112 95,112 99,108 C100,100 100,90 99,82 Z',
    'M101,82 C107,80 113,81 116,85 C119,90 119,99 116,106 C112,112 105,112 101,108 C100,100 100,90 101,82 Z',
  ],
  // narrow band across the hip crease
  hip_flexors: [
    'M77,159 C85,155 115,155 123,159 C126,165 126,173 123,179 C115,183 85,183 77,179 C74,173 74,165 77,159 Z',
  ],
  // long tapered front-thigh forms
  quadriceps: [
    'M79,188 C75,202 74,220 76,238 C77,246 79,251 83,251 C88,251 91,246 92,238 C94,220 95,204 96,188 C90,185 84,185 79,188 Z',
    'M121,188 C125,202 126,220 124,238 C123,246 121,251 117,251 C112,251 109,246 108,238 C106,220 105,204 104,188 C110,185 116,185 121,188 Z',
  ],
};

const BACK: Record<string, string[]> = {
  neck: [NECK],
  shoulders: DELTOIDS,
  // trapezius kite across the upper back
  thoracic: [
    'M100,73 C90,75 80,80 75,90 C79,102 86,114 100,126 C114,114 121,102 125,90 C120,80 110,75 100,73 Z',
  ],
  // lumbar band
  lower_back: [
    'M80,130 C88,126 112,126 120,130 C123,138 123,150 120,158 C112,162 88,162 80,158 C77,150 77,138 80,130 Z',
  ],
  // wide rounded seat band
  glutes: [
    'M74,166 C80,158 92,155 100,155 C108,155 120,158 126,166 C129,176 127,187 120,192 C112,196 88,196 80,192 C73,187 71,176 74,166 Z',
  ],
  // tapered forms down the back of each thigh
  hamstrings: [
    'M80,192 C75,206 74,224 76,240 C77,247 80,251 84,251 C88,250 91,246 92,239 C94,222 95,206 96,192 C90,189 85,189 80,192 Z',
    'M120,192 C125,206 126,224 124,240 C123,247 120,251 116,251 C112,250 109,246 108,239 C106,222 105,206 104,192 C110,189 115,189 120,192 Z',
  ],
  // tapered lower legs
  calves: [
    'M78,256 C75,266 75,280 77,292 C78,298 80,300 82,299 C85,298 87,293 88,286 C90,276 91,264 91,256 C87,253 82,253 78,256 Z',
    'M122,256 C125,266 125,280 123,292 C122,298 120,300 118,299 C115,298 113,293 112,286 C110,276 109,264 109,256 C113,253 118,253 122,256 Z',
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
      <g stroke="rgba(237,235,226,.16)" fill="rgba(237,235,226,.05)" strokeWidth={1} pointerEvents="none">
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
