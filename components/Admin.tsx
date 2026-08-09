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
import Chrome from './Chrome';
import { Gonio } from './Viz';
import { api, useSnapshot } from '@/lib/store';
import { MUSCLES, MODALITIES, SITE, service, addon, colorOf, iso, addDays, todayIso } from '@/lib/reference';

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const blankSession = (mins = 30) => ({
  mins, rpe: 6, painBefore: 5, painAfter: 2,
  modalities: ['Assisted stretch'] as string[], coachNotes: '', memberSummary: '',
});

/* Unscoped — this is the one surface that legitimately sees the whole
   studio: revenue, cross-coach outcomes, capacity, and every member. Content
   here was lifted out of the coach console (components/Coach.tsx) because a
   coach shouldn't see the business side of the studio; nothing about the
   data access here is new, only who it's shown to. */
export default function Admin() {
  const { data: snap, refresh } = useSnapshot();
  const [msg, setMsg] = useState<string | null>(null);
  const toast = (s: string) => { setMsg(s); setTimeout(() => setMsg(null), 2800); };
  const act = async (p: Promise<any>, m: string, after?: () => void) => {
    try { await p; toast(m); refresh(); after?.(); } catch (e: any) { toast(e?.error || 'Failed'); }
  };

  const [view, setView] = useState<'overview' | 'roster' | 'members'>('overview');
  const [open, setOpen] = useState<string | null>(null);
  const [newCoach, setNewCoach] = useState('');
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
    const mins = snap.bookings.filter((b: any) => b.date === date && b.status !== 'cancelled')
      .reduce((s: number, b: any) => s + service(b.serviceId).mins, 0);
    return Math.round((mins / (12 * 60 * Math.max(snap.coaches.length, 1))) * 100);
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
    return <Container sx={{ py: 6 }}><Typography variant="overline">Loading…</Typography></Container>;
  }

  const perCoach = snap.coaches.map((c: any) => {
    const ss = snap.sessions.filter((s: any) => s.coachId === c.id);
    return {
      ...c, sessions: ss.length,
      avgRpe: ss.length ? (ss.reduce((a: number, b: any) => a + b.rpe, 0) / ss.length).toFixed(1) : '—',
      painDrop: ss.length ? (ss.reduce((a: number, b: any) => a + (b.painBefore - b.painAfter), 0) / ss.length).toFixed(1) : '—',
    };
  });

  const renderOverview = () => (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box><Typography variant="overline" color="text.secondary">Operations</Typography><Typography variant="h4">Studio</Typography></Box>
        <Stack direction="row" spacing={3}>
          <Box><Typography variant="overline" color="text.secondary">Utilisation today</Typography><Typography variant="readout" sx={{ fontSize: 22 }}>{utilisation(today)}%</Typography></Box>
          <Box><Typography variant="overline" color="text.secondary">Booked today</Typography>
            <Typography variant="readout" sx={{ fontSize: 22 }}>
              AED {snap.bookings.filter((b: any) => b.date === today && b.status !== 'cancelled').reduce((s: number, b: any) => s + b.aed, 0)}
            </Typography></Box>
          <Box><Typography variant="overline" color="text.secondary">Sessions logged</Typography><Typography variant="readout" sx={{ fontSize: 22 }}>{snap.sessions.length}</Typography></Box>
        </Stack>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="overline" color="text.secondary">Coach outcomes</Typography>
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead><TableRow><TableCell>Coach</TableCell><TableCell align="right">Sessions</TableCell><TableCell align="right">Avg RPE</TableCell><TableCell align="right">Avg pain drop</TableCell></TableRow></TableHead>
              <TableBody>
                {perCoach.map((c: any) => (
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
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
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
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );

  const renderRoster = () => (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="overline" color="text.secondary">Staff</Typography>
      <Typography variant="h4" sx={{ mb: 2 }}>Roster</Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Coach</TableCell><TableCell>Title</TableCell><TableCell align="right">Sessions</TableCell></TableRow></TableHead>
              <TableBody>
                {perCoach.map((c: any) => (
                  <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell><Typography variant="body2" color="text.secondary">{c.title}</Typography></TableCell><TableCell align="right">{c.sessions}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="overline" color="text.secondary">Add a coach</Typography>
            <Stack spacing={1.5} sx={{ mt: 1.5 }}>
              <TextField label="Full name" value={newCoach} onChange={(e) => setNewCoach(e.target.value)} />
              <Button variant="contained" disabled={!newCoach.trim()} onClick={() =>
                act(api('POST', '/coaches', { name: newCoach }, 'ADMIN').then(() => setNewCoach('')), 'Coach added')}>
                Add coach
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );

  const renderMembers = () => {
    const cell = (v: number) => <TableCell align="right"><Typography variant="body2" sx={{ fontFamily: 'var(--font-mono)', color: v ? colorOf(v / 100) : 'text.disabled' }}>{v || '—'}</Typography></TableCell>;
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack direction="row" sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Box><Typography variant="overline" color="text.secondary">Roster</Typography><Typography variant="h4">Members</Typography></Box>
          <Stack direction="row" spacing={3}>
            <Box><Typography variant="overline" color="text.secondary">Active</Typography><Typography variant="readout" sx={{ fontSize: 22 }}>{snap.members.length}</Typography></Box>
            <Box><Typography variant="overline" color="text.secondary">Credits outstanding</Typography><Typography variant="readout" sx={{ fontSize: 22 }}>{snap.members.reduce((s: number, m: any) => s + m.credits, 0)}</Typography></Box>
          </Stack>
        </Stack>
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Member</TableCell><TableCell align="right">Flex</TableCell><TableCell align="right">Mob</TableCell><TableCell align="right">Rec</TableCell><TableCell align="right">Sessions</TableCell><TableCell align="right">Credits</TableCell><TableCell>Last</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {snap.members.map((m: any) => (
                <TableRow key={m.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpen(m.id)}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.name} {m.flags.length ? <Chip size="small" color="error" label={m.flags.length} sx={{ ml: 1 }} /> : null}</Typography>
                    <Typography variant="caption" color="text.secondary">{m.phone} · {m.persona}</Typography>
                  </TableCell>
                  {cell(m.scores.flexibility)}{cell(m.scores.mobility)}{cell(m.scores.recovery)}
                  <TableCell align="right">{m.sessionCount}</TableCell>
                  <TableCell align="right">{m.credits}</TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{m.lastSession || '—'}</Typography></TableCell>
                  <TableCell align="right"><Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); setOpen(m.id); }}>Open</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Container>
    );
  };

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

        {m.flags.map((f: any) => (
          <Paper key={f.id} variant="outlined" sx={{ p: 1.5, mt: 1.5, borderColor: 'error.main', display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip size="small" color="error" label="Flag" />
            <Typography variant="body2" sx={{ flex: 1 }}>{f.text}</Typography>
            <Button size="small" color="error" onClick={() => act(api('DELETE', `/members/${m.id}/flags/${f.id}`, undefined, 'ADMIN'), 'Flag cleared')}>Clear</Button>
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
          <TextField label="Coach notes — internal" multiline rows={2} fullWidth sx={{ mt: 2 }} value={sform.coachNotes} onChange={(e) => setSform({ ...sform, coachNotes: e.target.value })} />
          <TextField label="Summary the member reads" multiline rows={2} fullWidth sx={{ mt: 2 }} value={sform.memberSummary} onChange={(e) => setSform({ ...sform, memberSummary: e.target.value })} />
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

  return (
    <Chrome current="admin" label={`${SITE.name} — admin`} snap={snap} refresh={refresh} msg={msg}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Tabs value={view} onChange={(_, v) => setView(v)}>
            <Tab label="Overview" value="overview" />
            <Tab label="Roster" value="roster" />
            <Tab label="Members" value="members" />
          </Tabs>
        </Container>
      </Box>
      {view === 'overview' && renderOverview()}
      {view === 'roster' && renderRoster()}
      {view === 'members' && renderMembers()}
      {open && renderDrawer()}
    </Chrome>
  );
}
