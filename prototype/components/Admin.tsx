'use client';
import { useState, useEffect } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import LinearProgress from '@mui/material/LinearProgress';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CloseIcon from '@mui/icons-material/Close';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Fade from '@mui/material/Fade';
import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme, alpha } from '@mui/material/styles';
import Chrome from './Chrome';
import { Gonio } from './Viz';
import { PremiumCard } from './premium';
import { ConsoleSkeleton } from './skeletons';
import MembersList from './MembersList';
import { AmbientWash } from './MemberScreens';
import { api, useSnapshot } from '@/lib/store';
import { MUSCLES, MODALITIES, SITES, SERVICES, service, addon, siteById, iso, addDays, todayIso, scopeSnapshotForManager } from '@/lib/reference';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const blankSession = (mins = 30) => ({
  mins, rpe: 6, painBefore: 5, painAfter: 2,
  modalities: ['Assisted stretch'] as string[], coachNotes: '', memberSummary: '',
});

/* Shared by the Overview coach-outcomes table and the Earnings tab. "All"
 * has no cutoff. Revenue/outcomes are derived straight from bookings and
 * sessions — there is no ledger table yet (see docs/architecture/overview.md),
 * so this stays labeled "Earnings," not "Ledger." */
const RANGES = [
  { key: '7d', label: '7d', days: 7 },
  { key: '1m', label: '1m', days: 30 },
  { key: '6m', label: '6m', days: 180 },
  { key: 'all', label: 'All', days: null as number | null },
] as const;
type RangeKey = (typeof RANGES)[number]['key'];
const cutoffFor = (key: RangeKey) => {
  const r = RANGES.find((x) => x.key === key)!;
  return r.days === null ? null : iso(addDays(new Date(), -r.days));
};

/* Unscoped — this is the one surface that legitimately sees the whole
   studio: revenue, cross-coach outcomes, capacity, and every member. Content
   here was lifted out of the coach console (components/Coach.tsx) because a
   coach shouldn't see the business side of the studio; nothing about the
   data access here is new, only who it's shown to. */
export default function Admin() {
  const theme = useTheme();
  const { data: snap, refresh } = useSnapshot();
  const [msg, setMsg] = useState<string | null>(null);
  const toast = (s: string) => { setMsg(s); setTimeout(() => setMsg(null), 2800); };
  const act = async (p: Promise<any>, m: string, after?: () => void) => {
    try { await p; toast(m); refresh(); after?.(); } catch (e: any) { toast(e?.error || 'Failed'); }
  };

  const [view, setView] = useState<'overview' | 'roster' | 'members' | 'earnings'>('overview');
  const [overviewRange, setOverviewRange] = useState<RangeKey>('1m');
  const [earningsRange, setEarningsRange] = useState<RangeKey>('1m');
  const [siteFilter, setSiteFilter] = useState<'all' | string>('all');
  const [open, setOpen] = useState<string | null>(null);
  const [coachOpen, setCoachOpen] = useState<string | null>(null);
  const [newCoach, setNewCoach] = useState('');
  const [newCoachSite, setNewCoachSite] = useState(SITES[0].id);
  const [rom, setRom] = useState<Record<string, number>>({});
  const [romKey, setRomKey] = useState<string | null>(null);
  const [sform, setSform] = useState(blankSession());
  const [pgTitle, setPgTitle] = useState('');

  const today = todayIso();
  const memberOf = (id: string | null) => snap?.members.find((m: any) => m.id === id);
  const coachName = (id: string | null) => snap?.coaches.find((c: any) => c.id === id)?.name || '—';
  const measFor = (assessmentId: string | null) => snap?.measurements.filter((x: any) => x.assessmentId === assessmentId) ?? [];
  const utilisation = (date: string) => {
    if (!snap) return 0;
    const bks = siteFilter === 'all' ? snap.bookings : snap.bookings.filter((b: any) => b.siteId === siteFilter);
    const cs = siteFilter === 'all' ? snap.coaches : snap.coaches.filter((c: any) => c.siteId === siteFilter);
    const mins = bks.filter((b: any) => b.date === date && b.status !== 'cancelled')
      .reduce((s: number, b: any) => s + service(b.serviceId).mins, 0);
    return Math.round((mins / (12 * 60 * Math.max(cs.length, 1))) * 100);
  };

  const drawerMember = snap ? memberOf(open) : null;
  const drawerAssessmentId = drawerMember?.latestAssessmentId ?? null;

  useEffect(() => {
    if (!snap || !open) { setRomKey(null); return; }
    const key = `${open}:${drawerAssessmentId}`;
    if (romKey === key) return;
    const meas = snap.measurements.filter((x: any) => x.assessmentId === drawerAssessmentId);
    setRom(Object.fromEntries(MUSCLES.map((mu) => [
      mu.key, meas.find((x: any) => x.muscleKey === mu.key)?.degrees ?? Math.round(mu.target * 0.6),
    ])));
    if (romKey?.split(':')[0] !== open) {
      const bk = snap.bookings.find((b: any) => b.memberId === open && b.date === today && b.status === 'confirmed');
      setSform(blankSession(bk ? service(bk.serviceId).mins : 30));
      setPgTitle('');
    }
    setRomKey(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, open, drawerAssessmentId]);

  if (!snap) {
    return <ConsoleSkeleton tabs={4} statCount={3} />;
  }

  /* This is the one surface that legitimately sees every studio — the site
     filter below narrows the view, it does not gate access (see the header
     comment). 'all' passes the snapshot through unfiltered; picking a
     studio reuses the same scoping helper the manager console applies
     server-side, so "admin viewing site s2" and "s2's own manager" see
     identically-shaped data. */
  const scoped = siteFilter === 'all' ? snap : scopeSnapshotForManager(snap, siteFilter);

  const coachOutcomes = (cutoff: string | null) => scoped.coaches.map((c: any) => {
    const ss = snap.sessions.filter((s: any) => s.coachId === c.id && (!cutoff || s.completedAt >= cutoff));
    return {
      ...c, sessions: ss.length,
      avgRpe: ss.length ? (ss.reduce((a: number, b: any) => a + b.rpe, 0) / ss.length).toFixed(1) : '—',
      painDrop: ss.length ? (ss.reduce((a: number, b: any) => a + (b.painBefore - b.painAfter), 0) / ss.length).toFixed(1) : '—',
    };
  });
  const perCoach = coachOutcomes(null); // all-time, used by Roster
  const perCoachInRange = coachOutcomes(cutoffFor(overviewRange));

  const renderOverview = () => (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box><Typography variant="overline" color="text.secondary">Operations</Typography><Typography variant="h4">Studio</Typography></Box>
        <Stack direction="row" spacing={3}>
          <Box><Typography variant="overline" color="text.secondary">Utilisation today</Typography><Typography variant="readout" sx={{ fontSize: 22 }}>{utilisation(today)}%</Typography></Box>
          <Box><Typography variant="overline" color="text.secondary">Booked today</Typography>
            <Typography variant="readout" sx={{ fontSize: 22 }}>
              AED {scoped.bookings.filter((b: any) => b.date === today && b.status !== 'cancelled').reduce((s: number, b: any) => s + b.aed, 0)}
            </Typography></Box>
          <Box><Typography variant="overline" color="text.secondary">Sessions logged</Typography><Typography variant="readout" sx={{ fontSize: 22 }}>{scoped.sessions.length}</Typography></Box>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <PremiumCard sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="overline" color="text.secondary">Coach outcomes</Typography>
              <ToggleButtonGroup size="small" exclusive value={overviewRange} onChange={(_, v) => v && setOverviewRange(v)}>
                {RANGES.map((r) => <ToggleButton key={r.key} value={r.key}>{r.label}</ToggleButton>)}
              </ToggleButtonGroup>
            </Stack>
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead><TableRow><TableCell>Coach</TableCell><TableCell align="right">Sessions</TableCell><TableCell align="right">Avg RPE</TableCell><TableCell align="right">Avg pain drop</TableCell></TableRow></TableHead>
              <TableBody>
                {perCoachInRange.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 600 }}>{c.name}</Typography><Typography variant="caption" color="text.secondary">{c.title}</Typography></TableCell>
                    <TableCell align="right">{c.sessions}</TableCell>
                    <TableCell align="right">{c.avgRpe}</TableCell>
                    <TableCell align="right" sx={{ color: 'success.main' }}>{c.painDrop === '—' ? '—' : `−${c.painDrop}`}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Average pain drop per session is the outcome metric worth managing, and the number that sells a corporate contract.
            </Typography>
          </PremiumCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <PremiumCard sx={{ p: 2.5 }}>
            <Typography variant="overline" color="text.secondary">Capacity, next 7 days</Typography>
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              {[...Array(7)].map((_, i) => {
                const dd = iso(addDays(new Date(), i)); const u = utilisation(dd);
                return (
                  <Box key={dd}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}><Typography variant="body2" color="text.secondary">{fmtDate(dd)}</Typography><Typography variant="caption">{u}%</Typography></Stack>
                    <LinearProgress variant="determinate" value={Math.max(u, 2)} color={u < 40 ? 'error' : u < 70 ? 'warning' : 'success'} sx={{ mt: 0.5, borderRadius: 1, height: 6 }} />
                  </Box>
                );
              })}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Anything under 40% is a slot to push to nearby members at short notice.
            </Typography>
          </PremiumCard>
        </Grid>
      </Grid>
    </Container>
  );

  const renderEarnings = () => {
    const cutoff = cutoffFor(earningsRange);
    const inRange = scoped.bookings.filter((b: any) => b.status !== 'cancelled' && (!cutoff || b.date >= cutoff));
    const total = inRange.reduce((s: number, b: any) => s + b.aed, 0);

    const byDay = new Map<string, number>();
    for (const b of inRange) byDay.set(b.date, (byDay.get(b.date) || 0) + b.aed);
    const days = [...byDay.keys()].sort();

    const byService = SERVICES.map((sv) => {
      const bs = inRange.filter((b: any) => b.serviceId === sv.id);
      return { ...sv, count: bs.length, revenue: bs.reduce((s: number, b: any) => s + b.aed, 0) };
    }).filter((s) => s.count > 0);

    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack direction="row" sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
          <Box><Typography variant="overline" color="text.secondary">Booked revenue, not a ledger — see note below</Typography><Typography variant="h4">Earnings</Typography></Box>
          <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>
            <Box><Typography variant="overline" color="text.secondary">Total</Typography><Typography variant="readout" sx={{ fontSize: 22 }}>AED {total}</Typography></Box>
            <ToggleButtonGroup size="small" exclusive value={earningsRange} onChange={(_, v) => v && setEarningsRange(v)}>
              {RANGES.map((r) => <ToggleButton key={r.key} value={r.key}>{r.label}</ToggleButton>)}
            </ToggleButtonGroup>
          </Stack>
        </Stack>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <PremiumCard sx={{ p: 2.5 }}>
              <Typography variant="overline" color="text.secondary">Revenue by day</Typography>
              {days.length ? (
                <BarChart
                  height={240}
                  margin={{ top: 16, bottom: 24, left: 8, right: 8 }}
                  xAxis={[{ data: days, scaleType: 'band', valueFormatter: (v: string) => v.slice(5) }]}
                  series={[{ data: days.map((d) => byDay.get(d) || 0), label: 'AED', color: theme.palette.primary.main }]}
                  hideLegend
                />
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>No booked revenue in this range.</Typography>
              )}
            </PremiumCard>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <PremiumCard sx={{ p: 2.5 }}>
              <Typography variant="overline" color="text.secondary">By service</Typography>
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead><TableRow><TableCell>Service</TableCell><TableCell align="right">Bookings</TableCell><TableCell align="right">AED</TableCell></TableRow></TableHead>
                <TableBody>
                  {byService.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell align="right">{s.count}</TableCell>
                      <TableCell align="right">{s.revenue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </PremiumCard>
          </Grid>
        </Grid>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, maxWidth: '70ch' }}>
          This is booked revenue derived from the bookings table for the selected range — there is no credit ledger
          or transaction log behind it yet (see docs/architecture/overview.md). Treat it as a demo of what a real
          earnings report would show, not an accounting record.
        </Typography>
      </Container>
    );
  };

  const renderRoster = () => (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="overline" color="text.secondary">Staff</Typography>
      <Typography variant="h4" sx={{ mb: 2 }}>Roster</Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <PremiumCard sx={{ p: 2.5 }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Coach</TableCell><TableCell>Title</TableCell><TableCell align="right">Sessions</TableCell></TableRow></TableHead>
              <TableBody>
                {perCoach.map((c: any) => (
                  <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => setCoachOpen(c.id)}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{c.title}</Typography></TableCell>
                    <TableCell align="right">{c.sessions}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PremiumCard>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <PremiumCard sx={{ p: 2.5 }}>
            <Typography variant="overline" color="text.secondary">Add a coach</Typography>
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              <TextField label="Full name" size="small" value={newCoach} onChange={(e) => setNewCoach(e.target.value)} />
              <TextField select label="Studio" size="small" value={newCoachSite} onChange={(e) => setNewCoachSite(e.target.value)}>
                {SITES.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </TextField>
              <Button variant="contained" disabled={!newCoach.trim()} onClick={() =>
                act(api('POST', '/coaches', { name: newCoach, siteId: newCoachSite }, 'ADMIN').then(() => setNewCoach('')), 'Coach added')}>
                Add coach
              </Button>
            </Stack>
          </PremiumCard>
        </Grid>
      </Grid>
    </Container>
  );

  const renderMembers = () => (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box><Typography variant="overline" color="text.secondary">Roster</Typography><Typography variant="h4">Members</Typography></Box>
        <Stack direction="row" spacing={3}>
          <Box><Typography variant="overline" color="text.secondary">Active</Typography><Typography variant="readout" sx={{ fontSize: 22 }}>{scoped.members.length}</Typography></Box>
          <Box><Typography variant="overline" color="text.secondary">Credits outstanding</Typography><Typography variant="readout" sx={{ fontSize: 22 }}>{scoped.members.reduce((s: number, m: any) => s + m.credits, 0)}</Typography></Box>
        </Stack>
      </Stack>
      <MembersList site={siteFilter} onOpen={setOpen} />
    </Container>
  );

  const renderDrawer = () => {
    const m = drawerMember;
    if (!m) return null;
    const meas = measFor(m.latestAssessmentId);
    const a = snap.assessments.find((x: any) => x.id === m.latestAssessmentId);
    const prevA = snap.assessments.filter((x: any) => x.memberId === m.id)[1];
    const prevMeas = measFor(prevA?.id ?? null);
    const sess = snap.sessions.filter((s: any) => s.memberId === m.id);
    const pgs = snap.programs.filter((p: any) => p.memberId === m.id);
    const todayBooking = snap.bookings.find((b: any) => b.memberId === m.id && b.date === today && b.status === 'confirmed');

    return (
      <Drawer anchor="right" open onClose={() => setOpen(null)} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 480 }, p: 3 } } }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="overline" color="text.secondary">Member since {m.joinedAt} · {m.phone}</Typography>
            <Typography variant="h4">{m.name}</Typography>
            {m.goal && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Goal — {m.goal}</Typography>}
          </Box>
          <IconButton onClick={() => setOpen(null)}><CloseIcon /></IconButton>
        </Stack>

        {/* Safety flag, not an app error — warning (ochre) matches the brand's
            no-red rule and CLAUDE.md's "route to a human" framing over an alarm. */}
        {m.flags.map((f: any) => (
          <Paper key={f.id} variant="outlined" sx={{ p: 1.5, mt: 1.5, borderColor: 'warning.main', display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip size="small" color="warning" label="Flag" />
            <Typography variant="body2" sx={{ flex: 1 }}>{f.text}</Typography>
            <Button size="small" color="warning" onClick={() => act(api('DELETE', `/members/${m.id}/flags/${f.id}`, undefined, 'ADMIN'), 'Flag cleared')}>Clear</Button>
          </Paper>
        ))}
        {!m.parqCleared && (
          <Button size="small" variant="outlined" sx={{ mt: 1.5 }}
                  onClick={() => act(api('POST', `/members/${m.id}/parq`, { cleared: true }, 'ADMIN'), 'PAR-Q cleared — member can book')}>
            Mark PAR-Q cleared
          </Button>
        )}

        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="overline" color="text.secondary">{a ? `Latest assessment · ${a.capturedAt} · ${a.source}` : 'No assessment on record'}</Typography>
            <Button size="small" variant="outlined" onClick={() => act(
              api('POST', '/integrations/bodymap/import', { memberId: m.id, coachId: snap.coaches[0]?.id }, 'ADMIN'), 'BodyMap reading ingested')}>
              Import from BodyMap
            </Button>
          </Stack>
          {meas.length > 0 && (
            <Grid container spacing={1.5} sx={{ mt: 1 }}>
              <Grid size={4}><Gonio pct={m.scores.flexibility / 100} size={100} label={m.scores.flexibility} sub="FLEXIBILITY" /></Grid>
              <Grid size={4}><Gonio pct={m.scores.mobility / 100} size={100} label={m.scores.mobility} sub="MOBILITY" /></Grid>
              <Grid size={4}><Gonio pct={m.scores.recovery / 100} size={100} label={m.scores.recovery} sub="RECOVERY" /></Grid>
            </Grid>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {MUSCLES.map((mu) => {
              const pv = prevMeas.find((x: any) => x.muscleKey === mu.key)?.degrees;
              const cur = meas.find((x: any) => x.muscleKey === mu.key)?.degrees;
              const dl = pv !== undefined && cur !== undefined ? cur - pv : null;
              return (
                <Grid size={6} key={mu.key}>
                  <TextField
                    label={`${mu.label}${dl !== null ? ` (${dl >= 0 ? '+' : ''}${dl})` : ''}`}
                    type="number" size="small" fullWidth
                    slotProps={{ htmlInput: { min: 0, max: mu.target } }}
                    value={rom[mu.key] ?? ''}
                    onChange={(e) => setRom({ ...rom, [mu.key]: Number(e.target.value) })}
                    helperText={`target ${mu.target}°`}
                  />
                </Grid>
              );
            })}
          </Grid>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => act(
            api('POST', `/members/${m.id}/assessments`, { coachId: snap.coaches[0]?.id, measurements: MUSCLES.map((mu) => ({ key: mu.key, value: rom[mu.key] ?? 0 })) }, 'ADMIN'),
            'Assessment saved — member view updated')}>
            Save assessment
          </Button>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="overline" color="text.secondary">Log session{todayBooking ? ` · ${todayBooking.time} ${service(todayBooking.serviceId).name}` : ''}</Typography>
          <Stack direction="row" sx={{ mt: 1, flexWrap: 'wrap' }}>
            {MODALITIES.map((x) => (
              <FormControlLabel key={x} sx={{ mr: 2 }} control={
                <Checkbox size="small" checked={sform.modalities.includes(x)}
                          onChange={() => setSform({ ...sform, modalities: sform.modalities.includes(x) ? sform.modalities.filter((y) => y !== x) : [...sform.modalities, x] })} />
              } label={x} />
            ))}
          </Stack>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={6}><TextField label="Duration (min)" type="number" size="small" fullWidth value={sform.mins} onChange={(e) => setSform({ ...sform, mins: Number(e.target.value) })} /></Grid>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary">RPE {sform.rpe}/10</Typography>
              <Slider size="small" min={1} max={10} value={sform.rpe} onChange={(_, v) => setSform({ ...sform, rpe: v as number })} />
            </Grid>
            <Grid size={6}><TextField label="Pain before" type="number" size="small" fullWidth slotProps={{ htmlInput: { min: 0, max: 10 } }} value={sform.painBefore} onChange={(e) => setSform({ ...sform, painBefore: Number(e.target.value) })} /></Grid>
            <Grid size={6}><TextField label="Pain after" type="number" size="small" fullWidth slotProps={{ htmlInput: { min: 0, max: 10 } }} value={sform.painAfter} onChange={(e) => setSform({ ...sform, painAfter: Number(e.target.value) })} /></Grid>
          </Grid>
          <TextField label="Coach notes — internal" size="small" multiline rows={2} fullWidth sx={{ mt: 2 }} value={sform.coachNotes} onChange={(e) => setSform({ ...sform, coachNotes: e.target.value })} />
          <TextField label="Summary the member reads" size="small" multiline rows={2} fullWidth sx={{ mt: 2 }} value={sform.memberSummary} onChange={(e) => setSform({ ...sform, memberSummary: e.target.value })} />
          <Button variant="contained" sx={{ mt: 2 }} disabled={!sform.memberSummary.trim()} onClick={() => act(
            api('POST', '/sessions', { memberId: m.id, coachId: snap.coaches[0]?.id, bookingId: todayBooking?.id || null, ...sform }, 'ADMIN'),
            'Session logged — summary sent to member', () => setOpen(null))}>
            Log session
          </Button>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="overline" color="text.secondary">Home programme</Typography>
          {pgs.length ? (
            <><Typography variant="h6" sx={{ mt: 1 }}>{pgs[0].title}</Typography>
              <Typography variant="body2" color="text.secondary">{pgs[0].moves.length} moves · {pgs[0].completions.length} completions logged</Typography></>
          ) : <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>None assigned.</Typography>}
          <TextField label="Programme title" size="small" fullWidth sx={{ mt: 1.5 }} value={pgTitle} onChange={(e) => setPgTitle(e.target.value)} placeholder="e.g. Desk Reset — Block 3" />
          <Button variant="outlined" size="small" sx={{ mt: 1.5 }} onClick={() => act(
            api('POST', `/members/${m.id}/programs`, {
              title: pgTitle || 'Desk Reset — Block 3', coachId: snap.coaches[0]?.id,
              moves: [{ n: 'Couch stretch', d: '2 × 45s per side' }, { n: '90/90 hip switch', d: '8 slow reps' }, { n: 'Thoracic opener over roller', d: '60s' }],
            }, 'ADMIN').then(() => setPgTitle('')), 'Programme sent to member')}>
            Prescribe standard desk block
          </Button>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
          <Typography variant="overline" color="text.secondary">History · {sess.length} sessions</Typography>
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {sess.length ? sess.slice(0, 10).map((s: any) => (
              <Box key={s.id} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{s.completedAt} · {s.mins} min</Typography>
                  <Typography variant="caption" color="text.secondary">{coachName(s.coachId)} · RPE {s.rpe} · pain {s.painBefore}→{s.painAfter}</Typography></Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{s.coachNotes}</Typography>
              </Box>
            )) : <Typography variant="body2" color="text.secondary">No sessions logged.</Typography>}
          </Stack>
        </Paper>
      </Drawer>
    );
  };

  /** Coach detail — profile plus session history (item 4: clicking a coach in
   * Roster used to do nothing beyond the row itself). `snap` is unscoped
   * (Admin sees every studio), so filtering by coachId is enough. */
  const renderCoachDrawer = () => {
    const c = snap.coaches.find((x: any) => x.id === coachOpen);
    if (!c) return null;
    const coachSessions = snap.sessions.filter((s: any) => s.coachId === c.id);
    return (
      <Drawer anchor="right" open onClose={() => setCoachOpen(null)} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 420 }, p: 3 } } }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="overline" color="text.secondary">{siteById(c.siteId)?.name ?? c.siteId}</Typography>
            <Typography variant="h4">{c.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{c.title}</Typography>
          </Box>
          <IconButton onClick={() => setCoachOpen(null)} aria-label="Close coach"><CloseIcon /></IconButton>
        </Stack>

        <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
          <Box><Typography variant="overline" color="text.secondary">Sessions</Typography><Typography variant="readout" sx={{ fontSize: 22 }}>{coachSessions.length}</Typography></Box>
          <Box><Typography variant="overline" color="text.secondary">Avg RPE</Typography>
            <Typography variant="readout" sx={{ fontSize: 22 }}>{coachSessions.length ? (coachSessions.reduce((a: number, b: any) => a + b.rpe, 0) / coachSessions.length).toFixed(1) : '—'}</Typography></Box>
          <Box><Typography variant="overline" color="text.secondary">Avg pain drop</Typography>
            <Typography variant="readout" sx={{ fontSize: 22 }}>{coachSessions.length ? (coachSessions.reduce((a: number, b: any) => a + (b.painBefore - b.painAfter), 0) / coachSessions.length).toFixed(1) : '—'}</Typography></Box>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
          <Typography variant="overline" color="text.secondary">History · {coachSessions.length} sessions</Typography>
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {coachSessions.length ? coachSessions.slice(0, 15).map((s: any) => (
              <Box key={s.id} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'action.hover' }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.completedAt} · {s.mins} min</Typography>
                  <Typography variant="caption" color="text.secondary">{memberOf(s.memberId)?.name ?? 'Member'} · RPE {s.rpe} · pain {s.painBefore}→{s.painAfter}</Typography>
                </Stack>
                {s.coachNotes && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{s.coachNotes}</Typography>}
              </Box>
            )) : <Typography variant="body2" color="text.secondary">No sessions logged yet.</Typography>}
          </Stack>
        </Paper>
      </Drawer>
    );
  };

  const siteLabel = siteFilter === 'all' ? 'All studios' : SITES.find((s) => s.id === siteFilter)?.name ?? siteFilter;

  return (
    <Chrome current="admin" currentId="admin" label={`${siteLabel} — admin`} snap={snap} refresh={refresh} msg={msg}>
      <Box
        sx={{
          position: 'sticky', top: 'var(--marn-header-offset, 0px)', zIndex: (t) => t.zIndex.appBar,
          borderBottom: 1, borderColor: 'divider',
          bgcolor: (t) => alpha(t.palette.background.default, 0.86), backdropFilter: 'blur(12px)',
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, pt: 1.5 }}>
            <Tabs value={view} onChange={(_, v) => setView(v)}>
              <Tab label="Overview" value="overview" />
              <Tab label="Roster" value="roster" />
              <Tab label="Members" value="members" />
              <Tab label="Earnings" value="earnings" />
            </Tabs>
            <ToggleButtonGroup size="small" exclusive value={siteFilter} onChange={(_, v) => v && setSiteFilter(v)} sx={{ mb: 1 }}>
              <ToggleButton value="all">All studios</ToggleButton>
              {SITES.map((s) => <ToggleButton key={s.id} value={s.id}>{s.name.replace('Marn — ', '')}</ToggleButton>)}
            </ToggleButtonGroup>
          </Stack>
        </Container>
      </Box>
      <AmbientWash tab="admin">
        <Fade in key={view} timeout={220}>
          <Box>
            {view === 'overview' && renderOverview()}
            {view === 'roster' && renderRoster()}
            {view === 'members' && renderMembers()}
            {view === 'earnings' && renderEarnings()}
          </Box>
        </Fade>
      </AmbientWash>
      {open && renderDrawer()}
      {coachOpen && renderCoachDrawer()}
    </Chrome>
  );
}
