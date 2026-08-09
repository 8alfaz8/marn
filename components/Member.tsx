'use client';
import { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import AccessibilityNewOutlinedIcon from '@mui/icons-material/AccessibilityNewOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import SelfImprovementOutlinedIcon from '@mui/icons-material/SelfImprovementOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined';
import { LineChart } from '@mui/x-charts/LineChart';
import Chrome from './Chrome';
import ParqForm from './ParqForm';
import CheckinForm from './CheckinForm';
import { Gonio, BodyMap } from './Viz';
import { api, useSnapshot } from '@/lib/store';
import {
  MUSCLES, SERVICES, ADDONS, SITE,
  muscle, service, addon, colorOf, iso, addDays, todayIso,
} from '@/lib/reference';

/* ---------------------------------------------------------------------------
   Member surface.

   Self-contained: it owns the snapshot poll, its own toast, and the Chrome
   wrapper. app/member/page.tsx only hands it the id off the session cookie.

   STRUCTURE RULE (CLAUDE.md "Known trap"): nothing that renders is defined
   inside this component's body. The tab views below are plain functions that
   return JSX and are *called*, never mounted as <View />, so the five-second
   poll can never remount them and drop scroll position or in-progress input.
   Anything genuinely reusable — ParqForm, the small presentational pieces
   below — lives at module scope.

   Surfaces that carry Gonio or BodyMap render on an ink Paper: both are brand
   SVG drawn in bone-on-ink and would be invisible on MUI's white paper. This
   is the prototype's inverted data-panel pattern that theme.ts notes is not
   yet expressed as a Paper variant.
--------------------------------------------------------------------------- */

type TabKey = 'today' | 'home' | 'body' | 'progress' | 'book';

/* Home sits second, not last — it is the thing a member opens between visits. */
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'today', label: 'Today', icon: <TodayOutlinedIcon /> },
  { key: 'home', label: 'At Home', icon: <SelfImprovementOutlinedIcon /> },
  { key: 'body', label: 'Body', icon: <AccessibilityNewOutlinedIcon /> },
  { key: 'progress', label: 'Progress', icon: <ShowChartOutlinedIcon /> },
  { key: 'book', label: 'Book', icon: <EventAvailableOutlinedIcon /> },
];

const METRICS = ['flexibility', 'mobility', 'recovery'] as const;
type Metric = (typeof METRICS)[number];

/* Series colours are palette roles, not sentiment, and deliberately avoid
   warning/amber — that band is reserved for open safety flags. */
const METRIC_COLOR: Record<Metric, (t: Theme) => string> = {
  flexibility: (t) => t.palette.secondary.dark,
  mobility: (t) => t.palette.success.main,
  recovery: (t) => t.palette.primary.light,
};

const EMPTY_SNAP = {
  members: [], coaches: [], measurements: [], assessments: [],
  scoreDays: [], sessions: [], programs: [], bookings: [], checkins: [],
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;
/* Measured change, not sentiment: jade for gained range, clay for lost. */
const changeColor = (n: number) => (n >= 0 ? 'success.main' : 'error.main');
const statusChipColor = (s: string): 'secondary' | 'success' | 'default' =>
  (s === 'confirmed' ? 'secondary' : s === 'completed' ? 'success' : 'default');

/* ---------- module-scope presentational pieces ---------- */

function Eyebrow({ children, onInk }: { children: React.ReactNode; onInk?: boolean }) {
  return (
    <Typography
      variant="overline"
      component="div"
      sx={{ color: onInk ? 'primary.contrastText' : 'text.secondary', opacity: onInk ? 0.62 : 1 }}
    >
      {children}
    </Typography>
  );
}

function InkPanel({ children, sx }: { children: React.ReactNode; sx?: any }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, bgcolor: 'primary.main', color: 'primary.contrastText', borderColor: 'primary.light', ...sx }}
    >
      {children}
    </Paper>
  );
}

function ScoreRow({ label, value, delta }: { label: string; value: number; delta: number }) {
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Eyebrow onInk>{label}</Eyebrow>
        <Typography variant="overline" sx={{ color: changeColor(delta) }}>
          {signed(delta)} · 7d
        </Typography>
        <Typography variant="readout" sx={{ fontSize: '1.5rem' }}>{value}</Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.max(0, Math.min(100, value))}
        sx={{
          mt: 0.5, height: 6, borderRadius: 1,
          bgcolor: (t) => alpha(t.palette.primary.contrastText, 0.12),
          '& .MuiLinearProgress-bar': { bgcolor: colorOf(value / 100) },
        }}
      />
    </Box>
  );
}

function PageTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Typography variant="h3" sx={{ mt: 0.5 }}>{title}</Typography>
    </Box>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{children}</Typography>
    </Paper>
  );
}

/* =========================================================================== */

export default function Member({ memberId }: { memberId: string }) {
  const theme = useTheme();
  const { data: snap, error, refresh } = useSnapshot({ kind: 'member', id: memberId });

  const [msg, setMsg] = useState<string | null>(null);
  const toast = (s: string) => { setMsg(s); setTimeout(() => setMsg(null), 2800); };

  const [tab, setTab] = useState<TabKey>('today');
  const [sel, setSel] = useState('hamstrings');
  const [metric, setMetric] = useState<Metric>('flexibility');
  const [progressView, setProgressView] = useState<'scores' | 'history'>('scores');
  const [draft, setDraft] = useState<{ svc: string; date: string; slot: string | null; addons: string[] }>(
    { svc: 'st30', date: todayIso(), slot: null, addons: [] });
  const [slots, setSlots] = useState<any[]>([]);
  const [bookOpen, setBookOpen] = useState(false);
  const [parqOpen, setParqOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [referral, setReferral] = useState<string | null>(null);

  const s: any = snap ?? EMPTY_SNAP;

  const me = s.members.find((m: any) => m.id === memberId);
  const meas = s.measurements.filter((m: any) => m.assessmentId === me?.latestAssessmentId);
  const assessment = s.assessments.find((a: any) => a.id === me?.latestAssessmentId);
  const prevAssessment = s.assessments.filter((a: any) => a.memberId === memberId)[1];
  const prevMeas = s.measurements.filter((m: any) => m.assessmentId === prevAssessment?.id);
  const series = s.scoreDays.filter((x: any) => x.memberId === memberId);
  const sessions = s.sessions.filter((x: any) => x.memberId === memberId);
  const programs = s.programs.filter((p: any) => p.memberId === memberId);
  const myBookings = s.bookings.filter((b: any) => b.memberId === memberId && !['cancelled', 'completed'].includes(b.status));
  const next = [...myBookings].sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const coachName = (id: string | null) => s.coaches.find((c: any) => c.id === id)?.name || 'Coach to be assigned';

  useEffect(() => {
    if (tab !== 'book') return;
    api('GET', `/availability?date=${draft.date}&serviceId=${draft.svc}`, undefined, 'MEMBER')
      .then((r) => setSlots(r.slots)).catch(() => setSlots([]));
  }, [tab, draft.date, draft.svc]);

  const delta = (k: string) => {
    if (series.length < 8) return 0;
    return series[series.length - 1][k] - series[series.length - 8][k];
  };

  /* ---------- actions ---------- */

  const act = async (p: Promise<any>, ok: string) => {
    try { await p; toast(ok); refresh('MEMBER'); }
    catch (e: any) { toast(e?.error || 'Failed'); }
  };

  const book = async () => {
    try {
      const r = await api('POST', '/bookings',
        { memberId, serviceId: draft.svc, date: draft.date, time: draft.slot, addons: draft.addons }, 'MEMBER');
      toast(r.message);
      setDraft({ ...draft, slot: null });
      setBookOpen(false);
      setTab('today');
      refresh('MEMBER');
    } catch (e: any) { toast(e?.error || 'Could not book'); }
  };

  const onParqCleared = () => {
    setReferral(null);
    setParqOpen(false);
    toast('Screening complete — you can book now');
    refresh('MEMBER');
  };

  /* ---------- views (plain functions, never mounted as components) ---------- */

  const parqCallout = () => {
    if (!me || me.parqCleared) return null;
    return referral ? (
      <Alert severity="warning" variant="outlined">
        <AlertTitle>Check with a physician first</AlertTitle>
        {referral}
      </Alert>
    ) : (
      <Alert
        severity="warning"
        variant="outlined"
        action={<Button size="small" variant="outlined" onClick={() => setParqOpen(true)}>Start screening</Button>}
      >
        <AlertTitle>Readiness screening outstanding</AlertTitle>
        Seven quick questions about your health history. Booking opens as soon as they are answered.
      </Alert>
    );
  };

  const renderToday = () => {
    const priority = meas
      .map((m: any) => ({ ...m, pct: m.degrees / m.target }))
      .sort((a: any, b: any) => a.pct - b.pct)
      .slice(0, 3);

    return (
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Box>
            <Eyebrow>{SITE.name}</Eyebrow>
            <Typography variant="h3" sx={{ mt: 0.5 }}>Morning, {me.name.split(' ')[0]}.</Typography>
          </Box>
          <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
            <Typography variant="readout" sx={{ fontSize: '1.75rem' }}>{me.streak}</Typography>
            <Eyebrow>day streak</Eyebrow>
          </Box>
        </Stack>

        {meas.length ? (
          <InkPanel>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, sm: 5 }}>
                <Gonio pct={me.scores.flexibility / 100} size={164} label={me.scores.flexibility} sub="FLEXIBILITY" />
              </Grid>
              <Grid size={{ xs: 12, sm: 7 }}>
                <Stack spacing={1.5}>
                  <ScoreRow label="Mobility" value={me.scores.mobility} delta={delta('mobility')} />
                  <ScoreRow label="Recovery" value={me.scores.recovery} delta={delta('recovery')} />
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    Flexibility {signed(delta('flexibility'))} over 7 days
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </InkPanel>
        ) : (
          <InkPanel>
            <Eyebrow onInk>No assessment yet</Eyebrow>
            <Typography variant="h4" sx={{ mt: 1, mb: 1 }}>Your numbers start at your first session.</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              A coach measures ten muscle groups in about eight minutes. After that, every screen here has data in it.
            </Typography>
          </InkPanel>
        )}

        {parqCallout()}

        <Stack spacing={2.5} divider={<Divider />}>
          {next ? (
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Eyebrow>Next session</Eyebrow>
                <Chip size="small" label={next.status} color={statusChipColor(next.status)} />
              </Stack>
              <Typography variant="h5" sx={{ mt: 1 }}>{service(next.serviceId).name}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {fmtDate(next.date)} · {next.time} · {service(next.serviceId).mins} min · {coachName(next.coachId)}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                <Button variant="outlined" onClick={() => setCheckinOpen(true)}>
                  Pre-session check-in
                </Button>
                <Button
                  variant="text"
                  onClick={() => act(api('DELETE', `/bookings/${next.id}`, undefined, 'MEMBER'), 'Session cancelled')}
                >
                  Cancel
                </Button>
              </Stack>
            </Box>
          ) : (
            <Box>
              <Eyebrow>Nothing booked</Eyebrow>
              <Typography variant="h5" sx={{ mt: 1, mb: 2 }}>
                {sessions.length ? `Your last session was ${fmtDate(sessions[0].completedAt)}.` : 'Book your first session.'}
              </Typography>
              <Button variant="contained" onClick={() => setTab('book')}>Book a session</Button>
            </Box>
          )}

          {priority.length > 0 && (
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Eyebrow>Priority areas today</Eyebrow>
                <Button variant="text" size="small" onClick={() => setTab('body')}>Full body map</Button>
              </Stack>
              <List disablePadding sx={{ mt: 1 }}>
                {priority.map((p: any) => (
                  <ListItemButton
                    key={p.muscleKey}
                    onClick={() => { setSel(p.muscleKey); setTab('body'); }}
                    sx={{ px: 1, gap: 2 }}
                  >
                    <Box sx={{ width: 4, alignSelf: 'stretch', borderRadius: 1, bgcolor: colorOf(p.pct) }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2">{muscle(p.muscleKey).label}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {muscle(p.muscleKey).region} · {Math.round(p.pct * 100)}% of target arc
                      </Typography>
                    </Box>
                    <Typography variant="readout" sx={{ fontSize: '1.125rem' }}>{p.degrees}°</Typography>
                  </ListItemButton>
                ))}
              </List>
            </Box>
          )}

          <Box>
            <Eyebrow>Data streams</Eyebrow>
            <Typography variant="h5" sx={{ mt: 1 }}>
              {me.wearable ? `Connected — ${me.wearable}` : 'Sharpen your recovery score'}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Add heart-rate variability, sleep and strain from your wearable. Recovery becomes measured rather than estimated.
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
              {[{ id: 'whoop', label: 'Whoop' }, { id: 'apple', label: 'Apple Health' }].map((p) => {
                const on = me.wearable === p.id;
                return (
                  <FormControlLabel
                    key={p.id}
                    label={p.label}
                    control={
                      <Checkbox
                        checked={on}
                        disabled={on}
                        onChange={() => act(
                          api('POST', `/members/${memberId}/wearable`, { provider: p.id }, 'MEMBER'),
                          `${p.label} connected`,
                        )}
                      />
                    }
                  />
                );
              })}
            </Stack>
          </Box>
        </Stack>
      </Stack>
    );
  };

  const renderBody = () => {
    if (!meas.length) {
      return (
        <Stack spacing={2}>
          <PageTitle eyebrow="Range of motion" title="Body map" />
          <EmptyPanel>
            Nothing measured yet. Your coach captures ten joint angles at your first session and this map fills in.
          </EmptyPanel>
        </Stack>
      );
    }

    const m = meas.find((x: any) => x.muscleKey === sel) || meas[0];
    const info = muscle(m.muscleKey);
    const pv = prevMeas.find((x: any) => x.muscleKey === m.muscleKey);
    const drift = pv ? m.degrees - pv.degrees : null;

    return (
      <Stack spacing={2}>
        <PageTitle
          eyebrow={`Assessment · ${assessment?.capturedAt} · ${assessment?.source === 'bodymap' ? 'BodyMap device' : 'coach entry'}`}
          title="Range of motion"
        />

        <InkPanel>
          <Eyebrow onInk>Whole-body map</Eyebrow>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid size={6}>
              <Typography variant="overline" align="center" sx={{ display: 'block', color: 'primary.contrastText', opacity: 0.62 }}>
                Front
              </Typography>
              <BodyMap face="front" measurements={meas} selected={sel} onSelect={setSel} />
            </Grid>
            <Grid size={6}>
              <Typography variant="overline" align="center" sx={{ display: 'block', color: 'primary.contrastText', opacity: 0.62 }}>
                Back
              </Typography>
              <BodyMap face="back" measurements={meas} selected={sel} onSelect={setSel} />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { k: 'restricted', p: 0.4 }, { k: 'limited', p: 0.7 },
              { k: 'optimal', p: 0.8 }, { k: 'excellent', p: 0.95 },
            ].map((b) => (
              <Chip
                key={b.k}
                size="small"
                label={b.k}
                sx={{ bgcolor: colorOf(b.p), color: 'primary.main' }}
              />
            ))}
          </Stack>

          <Divider sx={{ my: 2.5, borderColor: 'primary.light' }} />

          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 7 }}>
              <Eyebrow onInk>{info.region} region</Eyebrow>
              <Typography variant="h4" sx={{ mt: 0.5, mb: 1 }}>{info.label}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>{info.note}</Typography>
              {drift !== null && (
                <Typography variant="overline" sx={{ display: 'block', mt: 1.5, color: changeColor(drift) }}>
                  {signed(drift)}° since {prevAssessment.capturedAt}
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12, sm: 5 }}>
              <Gonio pct={m.degrees / m.target} size={140} label={`${m.degrees}°`} sub={`OF ${m.target}°`} />
            </Grid>
          </Grid>
        </InkPanel>

        <Paper variant="outlined">
          <Box sx={{ p: 2.5, pb: 0 }}><Eyebrow>All groups</Eyebrow></Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Group</TableCell>
                  <TableCell align="right">Measured</TableCell>
                  <TableCell align="right">Target</TableCell>
                  <TableCell align="right">Of target</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MUSCLES.map((mu) => {
                  const x = meas.find((y: any) => y.muscleKey === mu.key);
                  if (!x) return null;
                  const p = x.degrees / x.target;
                  return (
                    <TableRow
                      key={mu.key}
                      hover
                      selected={sel === mu.key}
                      onClick={() => setSel(mu.key)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Box sx={{ width: 4, height: 24, borderRadius: 1, bgcolor: colorOf(p) }} />
                          <Box>
                            <Typography variant="subtitle2">{mu.label}</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{mu.region}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{x.degrees}°</TableCell>
                      <TableCell align="right">{x.target}°</TableCell>
                      <TableCell align="right">{Math.round(p * 100)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Stack>
    );
  };

  const renderProgress = () => {
    const cur = series.length ? series[series.length - 1][metric] : 0;
    const start = series.length ? series[0][metric] : 0;
    const labels = series.map((x: any) => String(x.date));
    const every = Math.max(1, Math.floor(labels.length / 7));

    const stat = (label: string, value: number, color?: string) => (
      <Box>
        <Eyebrow>{label}</Eyebrow>
        <Typography variant="readout" sx={{ color: color ?? 'text.primary' }}>{value}</Typography>
      </Box>
    );

    const renderScores = () => (
      <Stack spacing={2}>
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <ToggleButtonGroup size="small" exclusive value={metric} onChange={(_, v) => v && setMetric(v)}>
            {METRICS.map((k) => <ToggleButton key={k} value={k}>{cap(k)}</ToggleButton>)}
          </ToggleButtonGroup>

          <Stack direction="row" spacing={4} sx={{ mt: 2 }}>
            {stat('Now', cur)}
            {stat('At start', start, 'text.secondary')}
            <Box>
              <Eyebrow>Change</Eyebrow>
              <Typography variant="readout" sx={{ color: changeColor(cur - start) }}>
                {signed(cur - start)}
              </Typography>
            </Box>
          </Stack>

          {series.length ? (
            <LineChart
              height={240}
              margin={{ top: 16, bottom: 8, left: 8, right: 8 }}
              xAxis={[{
                data: labels,
                scaleType: 'point',
                tickLabelInterval: (_v: any, i: number) => i % every === 0 || i === labels.length - 1,
                valueFormatter: (v: any) => String(v).slice(5),
              }]}
              yAxis={[{ min: 30, max: 100 }]}
              grid={{ horizontal: true }}
              hideLegend
              series={[{
                data: series.map((x: any) => x[metric] as number),
                label: cap(metric),
                showMark: false,
                curve: 'monotoneX',
                color: METRIC_COLOR[metric](theme),
              }]}
            />
          ) : (
            <Box sx={{ mt: 2 }}>
              <EmptyPanel>No history yet. The line starts after your first assessment.</EmptyPanel>
            </Box>
          )}
        </Paper>

        {series.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Eyebrow>All three compared</Eyebrow>
            <LineChart
              height={200}
              margin={{ top: 16, bottom: 8, left: 8, right: 8 }}
              xAxis={[{
                data: labels,
                scaleType: 'point',
                tickLabelInterval: (_v: any, i: number) => i % every === 0 || i === labels.length - 1,
                valueFormatter: (v: any) => String(v).slice(5),
              }]}
              yAxis={[{ min: 30, max: 100 }]}
              grid={{ horizontal: true }}
              series={METRICS.map((k) => ({
                data: series.map((x: any) => x[k] as number),
                label: cap(k),
                showMark: false,
                curve: 'monotoneX',
                color: METRIC_COLOR[k](theme),
              }))}
            />
          </Paper>
        )}
      </Stack>
    );

    const renderHistory = () => (
      <Stack spacing={1.5}>
        <Eyebrow>{sessions.length} session{sessions.length === 1 ? '' : 's'} logged</Eyebrow>
        {sessions.length ? sessions.slice(0, 8).map((x: any) => (
          <Paper key={x.id} variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2">{x.mins} min · {x.modalities.join(' + ')}</Typography>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>{x.completedAt}</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {coachName(x.coachId)} · RPE {x.rpe} · pain {x.painBefore}→{x.painAfter}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>{x.memberSummary}</Typography>
          </Paper>
        )) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No sessions yet. Your coach&apos;s summary appears here after the first one.
          </Typography>
        )}
      </Stack>
    );

    return (
      <Stack spacing={2}>
        <PageTitle eyebrow={`Longitudinal · ${series.length} days on record`} title="Progress" />

        <Tabs value={progressView} onChange={(_, v) => setProgressView(v)} sx={{ minHeight: 40, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Scores" value="scores" sx={{ minHeight: 40 }} />
          <Tab label="History" value="history" sx={{ minHeight: 40 }} />
        </Tabs>

        {progressView === 'scores' ? renderScores() : renderHistory()}
      </Stack>
    );
  };

  const renderBookingsList = () => (
    <Stack spacing={2}>
      <PageTitle eyebrow={SITE.name} title="My bookings" />
      {parqCallout()}
      {myBookings.length ? (
        <Stack spacing={1.5}>
          {[...myBookings].sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time)).map((b: any) => (
            <Paper key={b.id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Eyebrow>{fmtDate(b.date)} · {b.time}</Eyebrow>
                <Chip size="small" label={b.status} color={statusChipColor(b.status)} />
              </Stack>
              <Typography variant="h5" sx={{ mt: 1 }}>{service(b.serviceId).name}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {service(b.serviceId).mins} min · {coachName(b.coachId)}
              </Typography>
              <Button
                variant="text"
                sx={{ mt: 1 }}
                onClick={() => act(api('DELETE', `/bookings/${b.id}`, undefined, 'MEMBER'), 'Session cancelled')}
              >
                Cancel
              </Button>
            </Paper>
          ))}
        </Stack>
      ) : (
        <EmptyPanel>No upcoming bookings yet.</EmptyPanel>
      )}
      <Button variant="contained" size="large" onClick={() => setBookOpen(true)}>Book a slot</Button>
    </Stack>
  );

  const renderBook = () => {
    if (!bookOpen) return renderBookingsList();

    const sv = service(draft.svc);
    const total = sv.aed + draft.addons.reduce((n, a) => n + addon(a).aed, 0);
    const dates = [...Array(7)].map((_, i) => addDays(new Date(), i));

    return (
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button variant="text" size="small" onClick={() => setBookOpen(false)}>← My bookings</Button>
        </Stack>
        <PageTitle eyebrow={SITE.name} title="Book a session" />

        {parqCallout()}

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Eyebrow>Service</Eyebrow>
          <ToggleButtonGroup
            orientation="vertical"
            exclusive
            fullWidth
            value={draft.svc}
            onChange={(_, v) => v && setDraft({ ...draft, svc: v, slot: null })}
            sx={{ mt: 1 }}
          >
            {SERVICES.map((x) => (
              <ToggleButton key={x.id} value={x.id} sx={{ textAlign: 'start', display: 'block', px: 2, py: 1.5 }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2">{x.name}</Typography>
                  <Typography variant="overline">AED {x.aed}</Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: 'text.secondary', textTransform: 'none' }}>
                  {x.mins} min · {x.desc}
                </Typography>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Box sx={{ mt: 3 }}>
            <Eyebrow>Date</Eyebrow>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={draft.date}
              onChange={(_, v) => v && setDraft({ ...draft, date: v, slot: null })}
              sx={{ mt: 1, flexWrap: 'wrap' }}
            >
              {dates.map((d) => (
                <ToggleButton key={iso(d)} value={iso(d)}>
                  {d.toLocaleDateString('en-GB', { weekday: 'short' })} {d.getDate()}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Eyebrow>Time</Eyebrow>
            {slots.length ? (
              <ToggleButtonGroup
                size="small"
                exclusive
                value={draft.slot}
                onChange={(_, v) => v && setDraft({ ...draft, slot: v })}
                sx={{ mt: 1, flexWrap: 'wrap' }}
              >
                {slots.map((x) => (
                  <ToggleButton key={x.time} value={x.time} disabled={x.busy}>{x.time}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                No times on this date. Try another day.
              </Typography>
            )}
          </Box>

          <Box sx={{ mt: 3 }}>
            <Eyebrow>Add-ons</Eyebrow>
            <Stack sx={{ mt: 0.5 }}>
              {ADDONS.map((a) => (
                <FormControlLabel
                  key={a.id}
                  label={`${a.name} · AED ${a.aed}`}
                  control={
                    <Checkbox
                      checked={draft.addons.includes(a.id)}
                      onChange={() => setDraft({
                        ...draft,
                        addons: draft.addons.includes(a.id)
                          ? draft.addons.filter((x) => x !== a.id)
                          : [...draft.addons, a.id],
                      })}
                    />
                  }
                />
              ))}
            </Stack>
          </Box>

          <Divider sx={{ my: 2.5 }} />

          <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <Box>
              <Eyebrow>Total</Eyebrow>
              <Typography variant="readout">AED {total}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {me.credits} session credits on account
              </Typography>
            </Box>
            <Button variant="contained" disabled={!draft.slot || !me.parqCleared} onClick={book}>
              Request session
            </Button>
          </Stack>
        </Paper>
      </Stack>
    );
  };

  const renderHome = () => (
    <Stack spacing={2}>
      <PageTitle eyebrow="Prescribed by your coach" title="Home programme" />
      {programs.length ? programs.map((p: any) => {
        const doneToday = p.completions.includes(todayIso());
        return (
          <Paper key={p.id} variant="outlined" sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Eyebrow>Assigned {p.assignedAt} · {coachName(p.coachId)}</Eyebrow>
                <Typography variant="h5" sx={{ mt: 0.5 }}>{p.title}</Typography>
              </Box>
              <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
                <Typography variant="readout" sx={{ fontSize: '1.75rem' }}>{p.completions.length}</Typography>
                <Eyebrow>done</Eyebrow>
              </Box>
            </Stack>

            <Stack sx={{ mt: 1.5 }}>
              {p.moves.map((mv: any, i: number) => (
                <Box key={i} sx={{ display: 'flex', gap: 2, py: 1, borderBlockStart: i ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                    {String(i + 1).padStart(2, '0')}
                  </Typography>
                  <Box>
                    <Typography variant="subtitle2">{mv.n}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{mv.d}</Typography>
                  </Box>
                </Box>
              ))}
            </Stack>

            <FormControlLabel
              sx={{ mt: 1 }}
              label={doneToday ? 'Logged for today' : 'Mark today complete'}
              control={
                <Checkbox
                  checked={doneToday}
                  disabled={doneToday}
                  onChange={() => act(api('POST', `/programs/${p.id}/complete`, {}, 'MEMBER'), 'Logged for today')}
                />
              }
            />
          </Paper>
        );
      }) : (
        <EmptyPanel>
          Nothing prescribed yet. Your coach assigns a home block after your next session — usually three or four moves
          that take under ten minutes.
        </EmptyPanel>
      )}
    </Stack>
  );

  const body = () => {
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!snap) return <Typography variant="overline" sx={{ color: 'text.secondary' }}>Loading…</Typography>;
    if (!me) return <Alert severity="error">We could not find that member account.</Alert>;
    switch (tab) {
      case 'today': return renderToday();
      case 'home': return renderHome();
      case 'body': return renderBody();
      case 'progress': return renderProgress();
      case 'book': return renderBook();
    }
  };

  return (
    <Chrome current="member" label={me?.name ?? 'Member'} snap={snap ?? EMPTY_SNAP} refresh={refresh} msg={msg}>
      <Container
        maxWidth="sm"
        sx={{ py: 3, paddingBlockEnd: (t) => `calc(${t.spacing(12)} + env(safe-area-inset-bottom))` }}
      >
        {body()}
      </Container>

      <Paper
        variant="outlined"
        sx={{
          position: 'fixed', insetBlockEnd: 0, insetInline: 0,
          zIndex: (t) => t.zIndex.appBar,
          borderRadius: 0, borderBlockEnd: 'none', borderInline: 'none',
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavigation showLabels value={tab} onChange={(_, v) => setTab(v as TabKey)}>
          {TABS.map((t) => <BottomNavigationAction key={t.key} value={t.key} label={t.label} icon={t.icon} />)}
        </BottomNavigation>
      </Paper>

      {me && (
        <ParqForm
          open={parqOpen}
          memberId={memberId}
          onClose={() => setParqOpen(false)}
          onCleared={onParqCleared}
          onReferral={(m) => setReferral(m)}
        />
      )}
      {me && (
        <CheckinForm
          open={checkinOpen}
          memberId={memberId}
          onClose={() => setCheckinOpen(false)}
          onSent={() => { setCheckinOpen(false); toast('Check-in sent to your coach'); refresh('MEMBER'); }}
        />
      )}
    </Chrome>
  );
}
