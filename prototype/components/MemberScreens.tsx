'use client';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import Button from '@mui/material/Button';
import { LineChart } from '@mui/x-charts/LineChart';
import { useState } from 'react';
import { Gonio } from './Viz';
import { MUSCLES, muscle, service, iso, clamp, bandOf, bandColor, bandLabel, type Band } from '@/lib/reference';

/* ---------------------------------------------------------------------------
   The five member-app brand screens (Today, Session detail, Mobility detail,
   Session report, Progress) plus the small shared pieces they're built from.

   Every screen here is a genuine module-scope component (never one defined
   inside Member.tsx's body — see CLAUDE.md's "Known trap"): the 5-second
   snapshot poll re-renders Member, and an inline component would remount and
   drop whatever local UI state a screen holds (e.g. the by-joint deg/gain
   toggle). Navigation state that must survive a tab switch (which session is
   open, which sub-screen of Sessions is showing) is lifted to Member.tsx and
   passed down as props, same convention as the dialogs there.

   Data provenance: every screen is wired to real prototype tables
   (sessions/assessments/measurements/scoreDays) where the shape exists.
   Mobility detail's symmetry/ease/hold-quality/held-tension/session-trace
   have no backing columns yet (no left/right split, no intra-session
   sampling) — those are clearly-commented derived placeholders, not
   fabricated random numbers, seeded from the session's real rpe/pain fields
   so the screen still tracks something real. See prototype/decisions.md.
--------------------------------------------------------------------------- */

type Snap = any;

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const fmtDateLong = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtMonth = (d: string) => new Date(d).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;
const normScore = (degrees: number, target: number) => clamp(Math.round((degrees / target) * 100), 0, 130);

/* ---------- derivation helpers (pure, no React) ---------- */

function assessmentsFor(snap: Snap, memberId: string) {
  return snap.assessments
    .filter((a: any) => a.memberId === memberId)
    .sort((a: any, b: any) => String(a.capturedAt).localeCompare(String(b.capturedAt)));
}
function measurementsFor(snap: Snap, assessmentId: string) {
  return snap.measurements.filter((m: any) => m.assessmentId === assessmentId);
}
/** The session log and the ROM assessment log are separate event streams in
 * this schema (a session has no measurements of its own). We tie a session
 * to the assessment closest in time, on or before it — the nearest real
 * measurement set, not invented data. */
function nearestAssessment(assessmentsAsc: any[], onOrBefore: string) {
  let pick = assessmentsAsc[0] ?? null;
  for (const a of assessmentsAsc) { if (a.capturedAt <= onOrBefore) pick = a; else break; }
  return pick;
}
function weekKey(d: Date) {
  const t = new Date(d);
  const day = (t.getDay() + 6) % 7; // Monday-based
  t.setDate(t.getDate() - day);
  return iso(t);
}
function weekStreak(sessions: any[]) {
  if (!sessions.length) return 0;
  const weeks = new Set(sessions.map((s: any) => weekKey(new Date(s.completedAt))));
  let n = 0;
  const cur = new Date();
  while (weeks.has(weekKey(cur))) { n++; cur.setDate(cur.getDate() - 7); }
  return n;
}
function last12Weeks(sessions: any[]) {
  const now = new Date();
  const out: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const wStart = new Date(now); wStart.setDate(wStart.getDate() - i * 7);
    const key = weekKey(wStart);
    out.push(sessions.filter((s: any) => weekKey(new Date(s.completedAt)) === key).length);
  }
  return out;
}
function avgPainChange(sessions: any[]) {
  if (!sessions.length) return 0;
  const total = sessions.reduce((s: number, x: any) => s + (x.painAfter - x.painBefore), 0);
  return Math.round((total / sessions.length) * 10) / 10;
}
/** Per muscle, gain in degrees between the member's first and latest assessment. Real data. */
function jointGains(snap: Snap, memberId: string) {
  const asc = assessmentsFor(snap, memberId);
  if (asc.length < 2) return [];
  const first = asc[0], last = asc[asc.length - 1];
  const firstMeas = measurementsFor(snap, first.id), lastMeas = measurementsFor(snap, last.id);
  return MUSCLES
    .map((mu) => {
      const f = firstMeas.find((x: any) => x.muscleKey === mu.key);
      const l = lastMeas.find((x: any) => x.muscleKey === mu.key);
      if (!f || !l) return null;
      return { key: mu.key, label: mu.label, gain: l.degrees - f.degrees, firstDate: first.capturedAt, lastDate: last.capturedAt };
    })
    .filter(Boolean) as { key: string; label: string; gain: number; firstDate: string; lastDate: string }[];
}
function jointTrend(snap: Snap, memberId: string, muscleKey: string) {
  return assessmentsFor(snap, memberId)
    .map((a: any) => {
      const m = snap.measurements.find((x: any) => x.assessmentId === a.id && x.muscleKey === muscleKey);
      return m ? { date: a.capturedAt, degrees: m.degrees, target: m.target } : null;
    })
    .filter(Boolean) as { date: string; degrees: number; target: number }[];
}
function byJointRows(snap: Snap, memberId: string, session: any) {
  const asc = assessmentsFor(snap, memberId);
  const a = nearestAssessment(asc, session.completedAt);
  if (!a) return [];
  const idx = asc.findIndex((x: any) => x.id === a.id);
  const prev = idx > 0 ? asc[idx - 1] : null;
  const meas = measurementsFor(snap, a.id);
  const prevMeas = prev ? measurementsFor(snap, prev.id) : [];
  return meas.map((m: any) => {
    const p = prevMeas.find((x: any) => x.muscleKey === m.muscleKey);
    return { key: m.muscleKey, label: muscle(m.muscleKey).label, degrees: m.degrees, target: m.target, change: p ? m.degrees - p.degrees : null };
  });
}
function timeInBand(session: any, rows: { degrees: number; target: number }[]) {
  const withBand = rows.map((m) => bandOf(normScore(m.degrees, m.target)));
  const order: Band[] = ['restricted', 'limited', 'optimal', 'excellent'];
  const total = withBand.length || 1;
  return order.map((b) => {
    const count = withBand.filter((x) => x === b).length;
    const pct = count / total;
    const secs = Math.round(pct * session.mins * 60);
    return { band: b, pct, mins: Math.floor(secs / 60), secs: secs % 60 };
  });
}
function sessionTitle(rows: { label: string; degrees: number; target: number }[]) {
  const sorted = [...rows].sort((a, b) => a.degrees / a.target - b.degrees / b.target);
  const top = sorted.slice(0, 2).map((r) => r.label);
  return top.length ? top.join(' & ') : 'Full body session';
}
/* Symmetry / ease / hold quality / held tension aren't captured anywhere in
 * the schema yet (no left/right split, no intra-session tension sampling).
 * Derived from the session's real rpe/pain fields as an illustrative stand-in
 * — replace with real signals (BodyMap L/R read, wearable strain) once
 * captured. Deterministic, not random, so the screen doesn't flicker. */
function derivedMobility(session: any) {
  const rpe = session?.rpe ?? 6, painBefore = session?.painBefore ?? 5, painAfter = session?.painAfter ?? 2;
  return {
    symmetry: clamp(0.99 - Math.abs(rpe - 6) * 0.01, 0.8, 0.99),
    ease: clamp((10 - rpe) + (painBefore - painAfter) * 0.2, 1, 10),
    holdQuality: clamp(1.2 + (painBefore - painAfter) * 0.06, 0.9, 1.8),
    heldTension: clamp(painAfter * 1.3, 0, 20),
  };
}
function sessionTrace(session: any) {
  const steps = 6;
  const painBefore = session?.painBefore ?? 5, painAfter = session?.painAfter ?? 2;
  const range: number[] = [], comfort: number[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    range.push(Math.round(54 + t * (142 - 54) + Math.sin(t * Math.PI * 2) * 3));
    comfort.push(Math.round((10 - (painBefore * (1 - t) + painAfter * t)) * 10) / 10);
  }
  return { range, comfort };
}

/* ---------- shared pieces ---------- */

export function AmbientWash({ tab, children }: { tab: 'today' | 'progress' | 'sessions'; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        backgroundImage: theme.marn.ambientWash[tab],
        backgroundRepeat: 'no-repeat',
        transition: 'background-image 420ms ease',
        minHeight: '100dvh',
      }}
    >
      {children}
    </Box>
  );
}

export function BandChip({ band, size = 'small' }: { band: Band; size?: 'small' | 'medium' }) {
  return (
    <Chip
      size={size}
      label={bandLabel(band).toUpperCase()}
      sx={{
        bgcolor: (t) => t.marn.bands[band],
        color: 'background.default',
        fontWeight: 700,
        letterSpacing: '0.06em',
      }}
    />
  );
}

export function StatTile({ label, value, unit }: { label: string; value: React.ReactNode; unit?: string }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 0 }}>
      <Typography variant="readout" sx={{ fontSize: '1.5rem', display: 'block' }}>
        {value}{unit && <Typography component="span" variant="readout" sx={{ fontSize: '1rem', color: 'primary.main' }}>{unit}</Typography>}
      </Typography>
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>{label}</Typography>
    </Paper>
  );
}

/** A labelled, band-coloured range bar — "Flexion 142° (88%, Excellent)". */
export function RangeBar({ label, degrees, target }: { label: string; degrees: number; target: number }) {
  const score = normScore(degrees, target);
  const band = bandOf(score);
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {degrees}° · {Math.min(score, 100)}% · {bandLabel(band)}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(score, 100)}
        sx={{
          height: 8, borderRadius: (t) => t.marn.radius.pill,
          bgcolor: 'background.raised',
          '& .MuiLinearProgress-bar': { bgcolor: (t) => t.marn.bands[band], borderRadius: (t) => t.marn.radius.pill },
        }}
      />
    </Box>
  );
}

/** A range track with a shaded "normal band" segment and a value handle — used by Mobility detail's Hold quality / Held tension cards. */
export function MarkerBar({ value, min, max, normalFrom, normalTo, band }: {
  value: number; min: number; max: number; normalFrom?: number; normalTo?: number; band: Band;
}) {
  const pct = (v: number) => clamp(((v - min) / (max - min)) * 100, 0, 100);
  return (
    <Box sx={{ position: 'relative', height: 8, borderRadius: (t) => t.marn.radius.pill, bgcolor: 'background.raised', mt: 1 }}>
      {normalFrom !== undefined && normalTo !== undefined && (
        <Box sx={{
          position: 'absolute', insetBlock: 0, insetInlineStart: `${pct(normalFrom)}%`,
          width: `${pct(normalTo) - pct(normalFrom)}%`, bgcolor: 'action.selected', borderRadius: (t) => t.marn.radius.pill,
        }} />
      )}
      <Box sx={{
        position: 'absolute', insetInlineStart: `calc(${pct(value)}% - 6px)`, top: '50%', transform: 'translateY(-50%)',
        width: 12, height: 12, borderRadius: '50%', bgcolor: (t) => t.marn.bands[band],
        border: '2px solid', borderColor: 'background.default',
      }} />
    </Box>
  );
}

/* ---------- 1. Today ---------- */

export function TodayScreen({ snap, memberId, onOpenBody, onOpenBooking, onOpenCheckin, onOpenHome }: {
  snap: Snap; memberId: string;
  onOpenBody: () => void; onOpenBooking: () => void; onOpenCheckin: () => void; onOpenHome: () => void;
}) {
  const me = snap.members.find((m: any) => m.id === memberId);
  const meas = snap.measurements.filter((m: any) => m.assessmentId === me?.latestAssessmentId);
  const sessions = snap.sessions.filter((s: any) => s.memberId === memberId);
  const bookings = snap.bookings.filter((b: any) => b.memberId === memberId && !['cancelled', 'completed'].includes(b.status));
  const next = [...bookings].sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const coach = (id: string | null) => snap.coaches.find((c: any) => c.id === id)?.name || 'Coach to be assigned';

  const gains = jointGains(snap, memberId);
  const focus = gains.length
    ? [...gains].sort((a, b) => b.gain - a.gain)[0]
    : (meas[0] ? { key: meas[0].muscleKey, label: muscle(meas[0].muscleKey).label, gain: 0 } : null);
  const focusMeas = focus ? meas.find((m: any) => m.muscleKey === focus.key) : null;
  const score = focusMeas ? normScore(focusMeas.degrees, focusMeas.target) : 0;
  const band = bandOf(score);

  const painValues = sessions.map((s: any) => s.painAfter);
  const avgPain = painValues.length ? Math.round((painValues.reduce((a: number, b: number) => a + b, 0) / painValues.length) * 10) / 10 : null;
  const weekSessions = sessions.filter((s: any) => weekKey(new Date(s.completedAt)) === weekKey(new Date())).length;

  return (
    <Stack spacing={3} sx={{ pt: 1 }}>
      <Stack direction="row" sx={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
          </Typography>
          <Typography variant="h3" sx={{ mt: 0.5, whiteSpace: 'pre-line' }}>{`Good morning,\n${me?.name?.split(' ')[0] ?? ''}`}</Typography>
        </Box>
        <Avatar sx={{
          width: 44, height: 44, flexShrink: 0,
          bgcolor: 'background.raised', border: '1px solid', borderColor: 'divider',
          color: 'text.secondary', fontFamily: 'var(--font-petrona)',
        }}>
          {me?.name?.[0] ?? '?'}
        </Avatar>
      </Stack>

      {focusMeas ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: (t) => t.marn.radius.lg }}>
          <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 104, flexShrink: 0 }}>
              <Gonio pct={score / 100} size={104} label={focusMeas.degrees} sub="°" color={bandColor(score)} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="overline" sx={{ color: (t) => t.marn.bands[band] }}>{bandLabel(band).toUpperCase()}</Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>{focus?.label}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, cursor: 'pointer' }} onClick={onOpenBody}>
                {focus && focus.gain !== 0 ? `Up ${signed(focus.gain)}° since your first session` : 'Full body map →'}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: (t) => t.marn.radius.lg }}>
          <Typography variant="h5">Your first session sets the baseline</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            A coach measures ten muscle groups in about eight minutes. After that, this ring fills in.
          </Typography>
        </Paper>
      )}

      <Stack direction="row" spacing={2}>
        <StatTile label="Sessions" value={sessions.length} />
        <StatTile label="Pain, avg" value={avgPain ?? '—'} />
        <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} sx={{ mb: 0.5 }}>
            {[0, 1, 2, 3].map((i) => (
              <Box key={i} sx={{
                width: 8, height: 8, borderRadius: '50%',
                bgcolor: i < weekSessions ? 'primary.main' : 'background.raised',
              }} />
            ))}
          </Stack>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>This week</Typography>
        </Paper>
      </Stack>

      <Box>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>Next in the studio</Typography>
        {next ? (
          <Paper variant="outlined" sx={{ p: 2, mt: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: (t) => t.marn.radius.sm, flexShrink: 0, textAlign: 'center',
              bgcolor: 'background.raised', display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <Typography variant="subtitle2" sx={{ lineHeight: 1 }}>{new Date(next.date).getDate()}</Typography>
              <Typography variant="overline" sx={{ fontSize: '0.5625rem', color: 'text.secondary' }}>{fmtMonth(next.date)}</Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6">{service(next.serviceId).name} · {service(next.serviceId).mins} min</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{coach(next.coachId)} · {fmtDate(next.date)} · {next.time}</Typography>
            </Box>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Nothing booked yet.</Typography>
          </Paper>
        )}
      </Box>

      <Stack direction="row" spacing={1.5}>
        <Button variant="contained" onClick={onOpenCheckin}>Log today</Button>
        <Button variant="outlined" onClick={onOpenBooking}>Book</Button>
      </Stack>

      {/* Home programme and the whole-body map are core existing features
          (blueprint/BodyMap boundary) the 5-screen brand handoff doesn't
          cover — kept reachable from Today as quick links rather than
          dropped, since the bottom nav itself narrows to the handoff's
          three tabs (Today/Progress/Sessions). See prototype/decisions.md. */}
      <Stack direction="row" spacing={1.5}>
        <Box onClick={onOpenBody} sx={{ flex: 1, cursor: 'pointer' }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2">Full body map</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Every group, front and back →</Typography>
          </Paper>
        </Box>
        <Box onClick={onOpenHome} sx={{ flex: 1, cursor: 'pointer' }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2">Home programme</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Your coach&apos;s prescribed moves →</Typography>
          </Paper>
        </Box>
      </Stack>
    </Stack>
  );
}

/* ---------- 2. Session detail ---------- */

export function SessionDetailScreen({ snap, memberId, session, onBack, onOpenMobility, onOpenReport }: {
  snap: Snap; memberId: string; session: any; onBack: () => void; onOpenMobility: () => void; onOpenReport: () => void;
}) {
  const [filter, setFilter] = useState<'range' | 'pain' | 'notes'>('range');
  const rows = byJointRows(snap, memberId, session).slice(0, 3);
  const title = sessionTitle(rows);
  const top = [...rows].sort((a, b) => b.degrees / b.target - a.degrees / a.target)[0];
  const topScore = top ? normScore(top.degrees, top.target) : 0;
  const coach = snap.coaches.find((c: any) => c.id === session.coachId);
  const prevSession = snap.sessions
    .filter((s: any) => s.memberId === memberId && s.completedAt < session.completedAt)
    .sort((a: any, b: any) => String(b.completedAt).localeCompare(String(a.completedAt)))[0];
  const prevRows = prevSession ? byJointRows(snap, memberId, prevSession) : [];
  const avgDelta = rows.length && prevRows.length
    ? Math.round(rows.reduce((s, r) => {
        const p = prevRows.find((x) => x.key === r.key);
        return s + (p ? r.degrees - p.degrees : 0);
      }, 0) / rows.length)
    : null;

  return (
    <Stack spacing={2.5} sx={{ pt: 1 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <IconButton size="small" onClick={onBack} sx={{ border: '1px solid', borderColor: 'divider' }}><ArrowBackIcon fontSize="small" /></IconButton>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" sx={{ border: '1px solid', borderColor: 'divider' }}><MoreHorizIcon fontSize="small" /></IconButton>
      </Stack>

      <Box>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>Session · {fmtDate(session.completedAt)}</Typography>
        <Typography variant="h3" sx={{ mt: 0.5 }}>{title}</Typography>
      </Box>

      <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => v && setFilter(v)}>
        <ToggleButton value="range">Range</ToggleButton>
        <ToggleButton value="pain">Pain</ToggleButton>
        <ToggleButton value="notes">Notes</ToggleButton>
      </ToggleButtonGroup>

      {filter === 'range' && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: (t) => t.marn.radius.lg }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="readout" sx={{ fontSize: '2.5rem' }}>
              {top?.degrees ?? '—'}<Typography component="span" variant="readout" sx={{ fontSize: '1.5rem', color: 'primary.main' }}>°</Typography>
            </Typography>
            {top && <BandChip band={bandOf(topScore)} />}
          </Stack>
          <Stack spacing={2}>
            {rows.map((r) => <RangeBar key={r.key} label={r.label} degrees={r.degrees} target={r.target} />)}
          </Stack>
        </Paper>
      )}
      {filter === 'pain' && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Reported pain, this session</Typography>
          <Typography variant="readout" sx={{ fontSize: '2.5rem', mt: 1 }}>{session.painBefore} → {session.painAfter}</Typography>
        </Paper>
      )}
      {filter === 'notes' && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="body2">{session.memberSummary || 'No notes for this session.'}</Typography>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'background.raised', color: 'text.secondary', fontFamily: 'var(--font-petrona)', flexShrink: 0 }}>
            {coach?.name?.[0] ?? '?'}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2">{coach?.name ?? 'Your therapist'}</Typography>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>Your therapist</Typography>
          </Box>
        </Stack>
        <Typography variant="body2" sx={{ mt: 1.5 }}>{session.memberSummary || 'No notes recorded for this session.'}</Typography>
      </Paper>

      {prevSession && avgDelta !== null && (
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Compare with the previous session</Typography>
          <Typography variant="subtitle2" sx={{ color: avgDelta >= 0 ? 'success.main' : 'primary.main' }}>{signed(avgDelta)}°</Typography>
        </Stack>
      )}

      <Divider />
      <Stack direction="row" spacing={1.5}>
        <Box onClick={onOpenMobility} sx={{ flex: 1, cursor: 'pointer' }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2">Mobility detail</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Gauges, hold quality, trace →</Typography>
          </Paper>
        </Box>
        <Box onClick={onOpenReport} sx={{ flex: 1, cursor: 'pointer' }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2">Session report</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Time in band, by joint →</Typography>
          </Paper>
        </Box>
      </Stack>
    </Stack>
  );
}

/* ---------- 3. Mobility detail ---------- */

export function MobilityDetailScreen({ session, onBack }: { session: any; onBack: () => void }) {
  const d = derivedMobility(session);
  const trace = sessionTrace(session);
  const theme = useTheme();

  return (
    <Stack spacing={2.5} sx={{ pt: 1 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <IconButton size="small" onClick={onBack} sx={{ border: '1px solid', borderColor: 'divider' }}><ArrowBackIcon fontSize="small" /></IconButton>
        <Typography variant="h5">Mobility detail</Typography>
      </Stack>

      <Stack direction="row" spacing={2}>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, position: 'relative' }}>
          <InfoOutlinedIcon sx={{ position: 'absolute', insetInlineEnd: 12, insetBlockStart: 12, fontSize: 16, color: 'text.secondary' }} />
          <Gonio pct={d.symmetry} size={96} label={d.symmetry.toFixed(2)} sub="EVEN" color={theme.marn.bands.optimal} />
          <Typography variant="overline" align="center" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>Symmetry</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, flex: 1, position: 'relative' }}>
          <InfoOutlinedIcon sx={{ position: 'absolute', insetInlineEnd: 12, insetBlockStart: 12, fontSize: 16, color: 'text.secondary' }} />
          <Gonio pct={d.ease / 10} size={96} label={d.ease.toFixed(1)} sub="RELAXED" color={theme.marn.bands.excellent} />
          <Typography variant="overline" align="center" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>Ease</Typography>
        </Paper>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography variant="subtitle2">Hold quality</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{d.holdQuality.toFixed(2)} · STEADY</Typography>
        </Stack>
        <MarkerBar value={d.holdQuality} min={0.5} max={2} normalFrom={1.41} normalTo={1.55} band="optimal" />
      </Paper>
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography variant="subtitle2">Held tension</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{d.heldTension.toFixed(1)}% · {d.heldTension > 8 ? 'WATCH' : 'STEADY'}</Typography>
        </Stack>
        <MarkerBar value={d.heldTension} min={0} max={20} band={d.heldTension > 8 ? 'limited' : 'optimal'} />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>Session trace</Typography>
        <LineChart
          height={130}
          margin={{ top: 12, bottom: 8, left: 8, right: 8 }}
          xAxis={[{ data: trace.range.map((_, i) => i), scaleType: 'point' }]}
          yAxis={[{ min: 0, max: 150 }]}
          hideLegend
          grid={{ horizontal: true }}
          series={[
            { data: trace.range, label: 'Range', showMark: false, color: theme.palette.secondary.main, curve: 'monotoneX' },
            { data: trace.comfort.map((v) => v * 14), label: 'Comfort', showMark: false, color: theme.palette.primary.main, curve: 'monotoneX' },
          ]}
        />
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 2, bgcolor: 'secondary.main' }} /><Typography variant="body2" sx={{ color: 'text.secondary' }}>Range</Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Box sx={{ width: 10, height: 2, bgcolor: 'primary.main' }} /><Typography variant="body2" sx={{ color: 'text.secondary' }}>Comfort</Typography>
          </Stack>
        </Stack>
        <Typography variant="overline" sx={{ display: 'block', mt: 1, color: (t) => t.marn.bands.limited }}>
          {Math.min(...trace.range)}–{Math.max(...trace.range)}°
        </Typography>
      </Paper>

      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Symmetry, ease, hold quality, held tension and the session trace aren&apos;t captured by an instrument yet —
        shown here as illustrative reads derived from this session&apos;s recorded pain and effort, not fabricated numbers.
      </Typography>
    </Stack>
  );
}

/* ---------- 4. Session report ---------- */

export function SessionReportScreen({ snap, memberId, session, onBack }: { snap: Snap; memberId: string; session: any; onBack: () => void }) {
  const [unit, setUnit] = useState<'deg' | 'gain'>('deg');
  const rows = byJointRows(snap, memberId, session);
  const bands = timeInBand(session, rows);
  const theme = useTheme();

  return (
    <Stack spacing={2.5} sx={{ pt: 1 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <IconButton size="small" onClick={onBack} sx={{ border: '1px solid', borderColor: 'divider' }}><ArrowBackIcon fontSize="small" /></IconButton>
        <Box sx={{ flex: 1 }} />
      </Stack>

      <Box>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>{fmtDateLong(session.completedAt)}</Typography>
        <Typography variant="h3" sx={{ mt: 0.5 }}>{sessionTitle(rows)}</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Chip size="small" variant="outlined" label={`${session.mins} min`} />
          <Chip size="small" variant="outlined" label={session.modalities.join(' + ')} />
        </Stack>
      </Box>

      <Box>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>Time in band</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>vs your last four sessions</Typography>
        <Stack spacing={1.5}>
          {bands.map((b) => (
            <Stack key={b.band} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography variant="body2" sx={{ width: 82, flexShrink: 0, color: b.pct >= 0.4 ? 'text.primary' : 'text.secondary' }}>
                {bandLabel(b.band)}
              </Typography>
              <Box sx={{ flex: 1, height: 14, borderRadius: (t) => t.marn.radius.pill, bgcolor: 'background.raised', overflow: 'hidden' }}>
                <Box sx={{ width: `${b.pct * 100}%`, height: '100%', bgcolor: (t) => t.marn.bands[b.band] }} />
              </Box>
              <Typography variant="body2" sx={{ width: 34, flexShrink: 0, textAlign: 'end' }}>{Math.round(b.pct * 100)}%</Typography>
              <Typography variant="body2" sx={{ width: 52, flexShrink: 0, textAlign: 'end', color: 'text.secondary' }}>
                {b.mins}:{String(b.secs).padStart(2, '0')}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>By joint</Typography>
          <ToggleButtonGroup size="small" exclusive value={unit} onChange={(_, v) => v && setUnit(v)}>
            <ToggleButton value="deg">deg</ToggleButton>
            <ToggleButton value="gain">gain</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <Table size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell>Joint</TableCell>
              <TableCell align="right">Range</TableCell>
              <TableCell align="right">Pain</TableCell>
              <TableCell align="right">Change</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => {
              const score = normScore(r.degrees, r.target);
              const band = bandOf(score);
              return (
                <TableRow key={r.key}>
                  <TableCell>{r.label}</TableCell>
                  <TableCell align="right" sx={{ color: (t) => t.marn.bands[band] }}>
                    {unit === 'deg' ? `${r.degrees}°` : `${Math.round((r.degrees / r.target) * 100)}%`}
                  </TableCell>
                  {/* Pain is only captured whole-session (painBefore/painAfter),
                      not per joint — showing the session's reading against every
                      row rather than fabricating a joint-level score. */}
                  <TableCell align="right">{(session.painAfter / 2).toFixed(1)}</TableCell>
                  <TableCell align="right" sx={{ color: r.change === null ? 'text.secondary' : r.change >= 0 ? 'success.main' : 'primary.main' }}>
                    {r.change === null ? '—' : signed(r.change)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Stack>
  );
}

/* ---------- 5. Progress ---------- */

export function ProgressScreen({ snap, memberId }: { snap: Snap; memberId: string }) {
  const theme = useTheme();
  const series = snap.scoreDays.filter((s: any) => s.memberId === memberId);
  const sessions = snap.sessions.filter((s: any) => s.memberId === memberId);
  const gains = jointGains(snap, memberId);
  const fastest = gains.length ? [...gains].sort((a, b) => b.gain - a.gain)[0] : null;
  const trend = fastest ? jointTrend(snap, memberId, fastest.key) : [];
  const weeks = last12Weeks(sessions);
  const streak = weekStreak(sessions);
  const painChange = avgPainChange(sessions);

  const opacityFor = (n: number) => (n === 0 ? undefined : n === 1 ? 0.35 : n === 2 ? 0.55 : n === 3 ? 0.75 : 1);

  return (
    <Stack spacing={2.5} sx={{ pt: 1 }}>
      <Box>
        <Typography variant="overline" sx={{ color: 'text.secondary' }}>Twelve weeks</Typography>
        <Typography variant="h3" sx={{ mt: 0.5 }}>
          {fastest ? `${fastest.label} is your fastest gain` : 'Your progress starts here'}
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: (t) => t.marn.radius.lg }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Typography variant="readout" sx={{ fontSize: '2.25rem' }}>
            {fastest ? signed(fastest.gain) : '—'}<Typography component="span" variant="readout" sx={{ fontSize: '1.25rem', color: 'primary.main' }}>°</Typography>
          </Typography>
          {fastest && <Chip size="small" variant="outlined" label={`SINCE ${fmtMonth(fastest.firstDate)}`} />}
        </Stack>
        {trend.length > 1 ? (
          <LineChart
            height={130}
            margin={{ top: 16, bottom: 24, left: 8, right: 8 }}
            xAxis={[{ data: trend.map((t) => t.date), scaleType: 'point', valueFormatter: (v: any) => fmtMonth(v) }]}
            yAxis={[{ min: 0 }]}
            hideLegend
            grid={{ horizontal: true }}
            series={[{
              data: trend.map((t) => t.degrees), label: 'Range', showMark: false, curve: 'monotoneX',
              color: theme.palette.primary.main, area: true,
            }]}
          />
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>Trend line fills in after your second assessment.</Typography>
        )}
      </Paper>

      <Stack direction="row" spacing={2}>
        <StatTile label="Sessions logged" value={sessions.length} />
        <StatTile label="Avg pain change" value={signed(painChange)} />
        <StatTile label="Week streak" value={streak} />
      </Stack>

      <Box>
        <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>Consistency</Typography>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>WEEK 1 → WEEK 12</Typography>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 1, mt: 1 }}>
          {weeks.map((n, i) => (
            <Box
              key={i}
              sx={{
                aspectRatio: '1', borderRadius: '5px',
                bgcolor: opacityFor(n) === undefined ? 'background.raised' : 'primary.main',
                opacity: opacityFor(n) ?? 1,
              }}
            />
          ))}
        </Box>
      </Box>

      {series.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No history yet — the trend line and consistency grid fill in after your first few sessions.
        </Typography>
      )}
    </Stack>
  );
}

/* ---------- Sessions list (entry point for the Sessions tab) ---------- */

export function SessionsListScreen({ snap, memberId, onOpenSession }: { snap: Snap; memberId: string; onOpenSession: (id: string) => void }) {
  const sessions = snap.sessions.filter((s: any) => s.memberId === memberId);
  const coach = (id: string) => snap.coaches.find((c: any) => c.id === id)?.name || 'Coach';

  return (
    <Stack spacing={1.5} sx={{ pt: 1 }}>
      <Typography variant="h3">Sessions</Typography>
      {sessions.length ? sessions.map((s: any) => (
        <Box key={s.id} onClick={() => onOpenSession(s.id)} sx={{ cursor: 'pointer' }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <EventOutlinedIcon sx={{ color: 'text.secondary' }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2">{s.modalities.join(' + ')}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{fmtDate(s.completedAt)} · {s.mins} min · {coach(s.coachId)}</Typography>
            </Box>
            <ChevronRightIcon sx={{ color: 'text.secondary' }} />
          </Paper>
        </Box>
      )) : (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No sessions yet. Book your first one and it will show up here with everything a coach measured.
          </Typography>
        </Paper>
      )}
    </Stack>
  );
}
