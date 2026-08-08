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

export function AreaChart({ series, keys, height = 170 }: { series: any[]; keys: string[]; height?: number }) {
  if (!series?.length) return <div className="kv" style={{ padding: 24 }}>No history yet. The line starts after your first assessment.</div>;
  const W = 680, H = height, PL = 34, PB = 22, PT = 10, min = 30, max = 100;
  const n = series.length;
  const X = (i: number) => PL + (W - PL - 6) * (n === 1 ? 0.5 : i / (n - 1));
  const Y = (v: number) => PT + (H - PT - PB) * (1 - (clamp(v, min, max) - min) / (max - min));
  const COLORS = ['#A9E34B', '#43B07C', '#E0A33C'];
  const every = Math.max(1, Math.floor(n / 7));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: 'block', height }}>
      <defs>
        <linearGradient id="marnFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A9E34B" stopOpacity=".35" />
          <stop offset="1" stopColor="#A9E34B" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[30, 50, 70, 90, 100].map((v) => (
        <g key={v}>
          <line x1={PL} y1={Y(v)} x2={W - 6} y2={Y(v)} stroke="rgba(237,235,226,.09)" />
          <text x={4} y={Y(v) + 3.5} fontFamily="JetBrains Mono,monospace" fontSize={9} fill="#8F9683">{v}</text>
        </g>
      ))}
      {keys.map((k, ki) => {
        const d = series.map((s, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(s[k]).toFixed(1)}`).join(' ');
        return (
          <g key={k}>
            {keys.length === 1 && <path d={`${d} L${X(n - 1)} ${H - PB} L${PL} ${H - PB} Z`} fill="url(#marnFill)" />}
            <path d={d} fill="none" stroke={COLORS[ki]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      })}
      {series.map((s, i) => (i % every === 0 || i === n - 1) && (
        <text key={i} x={X(i)} y={H - 6} textAnchor="middle" fontFamily="JetBrains Mono,monospace" fontSize={8.5} fill="#8F9683">
          {String(s.date).slice(5)}
        </text>
      ))}
    </svg>
  );
}

const FRONT: Record<string, string[]> = {
  neck: ['M92,60 h16 v14 h-16 z'],
  chest: ['M74,76 h52 v26 h-52 z'],
  shoulders: ['M62,74 h14 v30 h-14 z', 'M124,74 h14 v30 h-14 z'],
  hip_flexors: ['M78,158 h44 v20 h-44 z'],
  quadriceps: ['M79,180 h19 v58 h-19 z', 'M102,180 h19 v58 h-19 z'],
};
const BACK: Record<string, string[]> = {
  neck: ['M92,60 h16 v14 h-16 z'],
  thoracic: ['M78,80 h44 v34 h-44 z'],
  shoulders: ['M62,74 h14 v30 h-14 z', 'M124,74 h14 v30 h-14 z'],
  lower_back: ['M80,118 h40 v30 h-40 z'],
  glutes: ['M78,152 h44 v26 h-44 z'],
  hamstrings: ['M79,182 h19 v54 h-19 z', 'M102,182 h19 v54 h-19 z'],
  calves: ['M81,244 h16 v46 h-16 z', 'M103,244 h16 v46 h-16 z'],
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
      <g stroke="rgba(237,235,226,.16)" fill="rgba(237,235,226,.05)">
        <circle cx="100" cy="42" r="18" />
        <rect x="72" y="62" width="56" height="96" rx="8" />
        <rect x="56" y="72" width="14" height="72" rx="7" />
        <rect x="130" y="72" width="14" height="72" rx="7" />
        <rect x="77" y="158" width="21" height="134" rx="9" />
        <rect x="102" y="158" width="21" height="134" rx="9" />
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
