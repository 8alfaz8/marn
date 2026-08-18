'use client';
import { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Badge from '@mui/material/Badge';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Slider from '@mui/material/Slider';
import Drawer from '@mui/material/Drawer';
import Alert from '@mui/material/Alert';
import Fade from '@mui/material/Fade';
import CloseIcon from '@mui/icons-material/Close';
import Chrome from './Chrome';
import { Gonio } from './Viz';
import { PremiumCard } from './premium';
import { ConsoleSkeleton } from './skeletons';
import { api, useSnapshot } from '@/lib/store';
import { MUSCLES, MODALITIES, siteById, service, addon, colorOf, scopeSnapshotForCoach, todayIso } from '@/lib/reference';

/* NOTE ON STRUCTURE
   Every piece of form state lives in this component, not in the sub-views.
   The snapshot is polled every few seconds, which re-renders this tree; if a
   view held its own state it would be remounted and a coach's half-typed
   session notes would vanish mid-session. The renderX helpers below are called
   as plain functions, never as <Component />, for the same reason: as JSX they
   would be a new component identity on every poll. Keep new state here. */

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const blankSession = (mins = 30) => ({
  mins, rpe: 6, painBefore: 5, painAfter: 2,
  modalities: ['Assisted stretch'] as string[], coachNotes: '', memberSummary: '',
});

/* Confirmed / completed / requested. Warning (amber) is deliberately absent —
   the theme reserves it for open safety flags, so a booking state never wears it. */
const statusChip = (status: string) =>
  status === 'completed' ? { color: 'success' as const, variant: 'filled' as const }
    : status === 'confirmed' ? { color: 'secondary' as const, variant: 'filled' as const }
      : { color: 'default' as const, variant: 'outlined' as const };

type Stat = { label: string; value: number | string };

export default function Coach({ coachId }: { coachId: string }) {
  const { data: rawSnap, error, refresh } = useSnapshot({ kind: 'coach', id: coachId });

  const [msg, setMsg] = useState<string | null>(null);
  const toast = (s: string) => { setMsg(s); setTimeout(() => setMsg(null), 2800); };

  const [view, setView] = useState<'today' | 'members' | 'requests'>('today');
  const [open, setOpen] = useState<string | null>(null);

  const [newMember, setNewMember] = useState({ name: '', phone: '', goal: '', parqCleared: false });
  const [rom, setRom] = useState<Record<string, number>>({});
  const [romKey, setRomKey] = useState<string | null>(null);
  const [sform, setSform] = useState(blankSession());
  const [pgTitle, setPgTitle] = useState('');

  /* Client-side scoping only: this trims the polled snapshot to this coach's
     own bookings and members, but there is no auth in the prototype yet — a
     coach with dev tools open still sees the raw /api/snapshot response.
     Server-side enforcement lands with the blueprint's auth phase.
     See docs/adr/0002-prototype-auth-gap.md. */
  const snap = rawSnap ? scopeSnapshotForCoach(rawSnap, coachId) : null;

  const today = todayIso();
  const memberOf = (id: string | null) => snap?.members.find((m: any) => m.id === id);
  const coachNameOf = (id: string | null) => snap?.coaches.find((c: any) => c.id === id)?.name || '—';
  const measFor = (assessmentId: string | null) => (snap ? snap.measurements.filter((x: any) => x.assessmentId === assessmentId) : []);

  const drawerMember = memberOf(open);
  const drawerAssessmentId = drawerMember?.latestAssessmentId ?? null;

  /* Load the ROM inputs when the drawer opens, and again when a new assessment
     lands for that member — so a BodyMap import visibly refreshes the fields. */
  useEffect(() => {
    if (!open || !snap) { if (!open) setRomKey(null); return; }
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
  }, [open, drawerAssessmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rawSnap || !snap) {
    if (error) {
      return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
          <Alert severity="error">{error}. The console reloads on its own once the API answers.</Alert>
        </Container>
      );
    }
    return <ConsoleSkeleton tabs={3} />;
  }

  const pending = snap.bookings.filter((b: any) => b.status === 'requested');
  const coachRow = rawSnap.coaches.find((c: any) => c.id === coachId);
  const coachName = coachRow?.name || 'Coach';
  const siteName = siteById(coachRow?.siteId)?.name || 'Studio';

  const act = async (p: Promise<any>, message: string, close = false) => {
    try { await p; toast(message); if (close) setOpen(null); refresh(); }
    catch (e: any) { toast(e?.error || 'Failed'); }
  };

  /* ---------------- shared bits ---------------- */

  const head = (eyebrow: string, title: string, stats: Stat[] = []) => (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}
           sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-end' }, mb: 3 }}>
      <Box>
        <Typography variant="overline" color="text.secondary">{eyebrow}</Typography>
        <Typography variant="h3" sx={{ fontSize: { xs: 28, md: 34 } }}>{title}</Typography>
      </Box>
      {stats.length > 0 && (
        <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }}>
          {stats.map((s) => (
            <Box key={s.label} sx={{ textAlign: 'start' }}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>{s.label}</Typography>
              <Typography variant="readout" sx={{ display: 'block' }}>{s.value}</Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );

  const panel = (eyebrow: string, children: React.ReactNode, action?: React.ReactNode) => (
    <PremiumCard sx={{ p: 3, height: '100%' }}>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="overline" color="text.secondary">{eyebrow}</Typography>
        {action}
      </Stack>
      <Box sx={{ mt: 2 }}>{children}</Box>
    </PremiumCard>
  );

  /* ---------------- views ---------------- */

  const renderToday = () => {
    const bks = snap.bookings.filter((b: any) => b.date === today && b.status !== 'cancelled');
    const confirmed = bks.filter((b: any) => b.status === 'confirmed').length;
    const flagCount = snap.members.reduce((s: number, m: any) => s + m.flags.length, 0);

    return (
      <>
        {head(
          `${siteName} · ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`,
          'Your floor today',
          [
            { label: 'Booked', value: bks.length },
            { label: 'Confirmed', value: confirmed },
            { label: 'Awaiting reply', value: pending.length },
            { label: 'Open flags', value: flagCount },
          ],
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            {panel('Schedule', (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell align="right">Time</TableCell>
                      <TableCell>Member</TableCell>
                      <TableCell>Service</TableCell>
                      <TableCell>Coach</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bks.length ? bks.map((b: any) => {
                      const m = memberOf(b.memberId);
                      if (!m) return null;
                      return (
                        <TableRow key={b.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpen(m.id)}>
                          <TableCell align="right">{b.time}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                              <Typography variant="subtitle2">{m.name}</Typography>
                              {m.flags.length > 0 && <Chip size="small" color="warning" label="Flag" />}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{service(b.serviceId).name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {service(b.serviceId).mins} min
                              {b.addons.length ? ` · +${b.addons.map((a: string) => addon(a).name).join(', ')}` : ''}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{coachNameOf(b.coachId)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={b.status} {...statusChip(b.status)} />
                          </TableCell>
                          <TableCell align="right">
                            {b.status === 'requested' ? (
                              <Button size="small" variant="contained" onClick={(e) => {
                                e.stopPropagation();
                                act(api('POST', `/bookings/${b.id}/confirm`, { coachId }, 'COACH'), 'Confirmed — member notified');
                              }}>Confirm</Button>
                            ) : b.status === 'confirmed' ? (
                              <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); setOpen(m.id); }}>
                                Log session
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            Nothing on your floor today. Requests land here as members book.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            ))}
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={2}>
              {panel('Attention', (
                <Stack spacing={1}>
                  {snap.members.flatMap((m: any) => m.flags.map((f: any) => (
                    <Alert key={f.id} severity="warning" icon={false} sx={{ alignItems: 'center' }}>
                      <Typography variant="subtitle2" component="span">{m.name.split(' ')[0]}</Typography>
                      {' — '}
                      <Typography variant="body2" component="span">{f.text}</Typography>
                    </Alert>
                  ))).slice(0, 5)}
                  {snap.members.every((m: any) => !m.flags.length) && (
                    <Typography variant="body2" color="text.secondary">No open flags.</Typography>
                  )}
                </Stack>
              ))}

              {panel('Pre-session check-ins', (
                <Stack spacing={1}>
                  {snap.checkins.length ? snap.checkins.slice(0, 4).map((c: any) => (
                    <Paper key={c.id} variant="outlined" sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <Typography variant="subtitle2">{memberOf(c.memberId)?.name || 'Member'}</Typography>
                        <Typography variant="caption" color="text.secondary">{fmtTime(c.at)}</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Sleep {c.sleep}/5 · pain {c.pain}/10 · {c.areas.join(', ') || 'no areas noted'}
                      </Typography>
                      {c.note && <Typography variant="body2" sx={{ mt: 0.5 }}>{c.note}</Typography>}
                    </Paper>
                  )) : (
                    <Typography variant="body2" color="text.secondary">
                      Members who check in before arriving show up here, so you know the plan before they walk in.
                    </Typography>
                  )}
                </Stack>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </>
    );
  };

  const renderMembers = () => {
    const scoreCell = (v: number, k: string) => (
      <TableCell key={k} align="right" sx={{ color: v ? colorOf(v / 100) : 'text.disabled' }}>{v || '—'}</TableCell>
    );

    return (
      <>
        {head('Your roster', 'Members', [{ label: 'Active', value: snap.members.length }])}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            {panel('Members you work with', (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Member</TableCell>
                      <TableCell align="right">Flex</TableCell>
                      <TableCell align="right">Mob</TableCell>
                      <TableCell align="right">Rec</TableCell>
                      <TableCell align="right">Sessions</TableCell>
                      <TableCell align="right">Credits</TableCell>
                      <TableCell>Last</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {snap.members.length ? snap.members.map((m: any) => (
                      <TableRow key={m.id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpen(m.id)}>
                        <TableCell>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <Typography variant="subtitle2">{m.name}</Typography>
                            {m.flags.length > 0 && <Chip size="small" color="warning" label={m.flags.length} />}
                          </Stack>
                          <Typography variant="caption" color="text.secondary">{m.phone} · {m.persona}</Typography>
                        </TableCell>
                        {scoreCell(m.scores.flexibility, 'f')}
                        {scoreCell(m.scores.mobility, 'm')}
                        {scoreCell(m.scores.recovery, 'r')}
                        <TableCell align="right">{m.sessionCount}</TableCell>
                        <TableCell align="right">{m.credits}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{m.lastSession || '—'}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); setOpen(m.id); }}>
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8}>
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            No members yet. Anyone you take a session with appears here.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            ))}
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            {panel('Add a member', (
              <Stack spacing={2}>
                <Typography variant="h5">New sign-up</Typography>
                <TextField label="Full name" value={newMember.name}
                           onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} />
                <TextField label="Phone" placeholder="+971 5x xxx xxxx" value={newMember.phone}
                           onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} />
                <TextField label="What they want to fix" placeholder="e.g. lower back stiffness" value={newMember.goal}
                           onChange={(e) => setNewMember({ ...newMember, goal: e.target.value })} />
                <FormControlLabel
                  control={<Checkbox checked={newMember.parqCleared}
                                     onChange={(e) => setNewMember({ ...newMember, parqCleared: e.target.checked })} />}
                  label={<Typography variant="body2">PAR-Q completed and cleared</Typography>}
                />
                <Box>
                  <Button variant="contained" disabled={!newMember.name.trim()} onClick={() => act(
                    api('POST', '/members', { ...newMember, coachId }, 'COACH')
                      .then(() => setNewMember({ name: '', phone: '', goal: '', parqCleared: false })),
                    'Member created — starts with no data')}>Create member</Button>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  A new member starts genuinely empty: no scores, no body map, no history. That empty state is what most
                  people actually see on day one, so it is worth looking at.
                </Typography>
              </Stack>
            ))}
          </Grid>
        </Grid>
      </>
    );
  };

  const renderRequests = () => (
    <>
      {head('Inbox', 'Requests')}
      <Stack spacing={2} sx={{ maxWidth: 900 }}>
        {pending.length ? pending.map((b: any) => {
          const m = memberOf(b.memberId);
          if (!m) return null;
          const mins = Math.max(1, Math.round((Date.now() - new Date(b.createdAt).getTime()) / 6e4));
          return (
            <PremiumCard key={b.id} sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}
                     sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}>
                <Box>
                  <Typography variant="overline" color="text.secondary">Requested {mins} min ago</Typography>
                  <Typography variant="h5" sx={{ mt: 0.5 }}>{m.name} · {service(b.serviceId).name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {fmtDate(b.date)} · {b.time} · {service(b.serviceId).mins} min
                    {b.addons.length ? ` · +${b.addons.map((a: string) => addon(a).name).join(', ')}` : ''}
                  </Typography>
                  {m.flags.length > 0 && (
                    <Alert severity="warning" icon={false} sx={{ mt: 2 }}>{m.flags[0].text}</Alert>
                  )}
                </Box>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  <Button variant="contained" onClick={() => act(
                    api('POST', `/bookings/${b.id}/confirm`, { coachId }, 'COACH'), 'Confirmed — member notified')}>
                    Confirm
                  </Button>
                  <Button variant="outlined" onClick={() => act(
                    api('POST', `/bookings/${b.id}/decline`, { reason: 'No coach available' }, 'COACH'), 'Declined — member notified')}>
                    Decline
                  </Button>
                </Stack>
              </Stack>
            </PremiumCard>
          );
        }) : (
          <PremiumCard sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">Inbox clear. New booking requests land here.</Typography>
          </PremiumCard>
        )}
      </Stack>
    </>
  );

  /* ---------------- member drawer ---------------- */

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
      <Drawer anchor="right" open onClose={() => setOpen(null)}
              slotProps={{ paper: { sx: { width: { xs: '100%', sm: 620, lg: 760 }, maxWidth: '100%' } } }}>
        <Box sx={{ p: 3 }}>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="overline" color="text.secondary">Member since {m.joinedAt} · {m.phone}</Typography>
              <Typography variant="h3" sx={{ fontSize: { xs: 30, md: 38 } }}>{m.name}</Typography>
              {m.goal && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Goal — {m.goal}</Typography>}
            </Box>
            <IconButton onClick={() => setOpen(null)} aria-label="Close member">
              <CloseIcon />
            </IconButton>
          </Stack>

          <Stack spacing={2} sx={{ mt: 2 }}>
            {m.flags.map((f: any) => (
              <Alert key={f.id} severity="warning" action={
                <Button size="small" color="warning" onClick={() => act(
                  api('DELETE', `/members/${m.id}/flags/${f.id}`, undefined, 'COACH'), 'Flag cleared')}>Clear</Button>
              }>{f.text}</Alert>
            ))}
            {!m.parqCleared && (
              <Box>
                <Button variant="outlined" onClick={() => act(
                  api('POST', `/members/${m.id}/parq`, { cleared: true }, 'COACH'), 'PAR-Q cleared — member can book')}>
                  Mark PAR-Q cleared
                </Button>
              </Box>
            )}

            {panel(a ? `Latest assessment · ${a.capturedAt} · ${a.source}` : 'No assessment on record', (
              <>
                {meas.length > 0 && (
                  <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 2, mb: 3 }}>
                    <Grid container spacing={2}>
                      {([
                        ['FLEXIBILITY', m.scores.flexibility],
                        ['MOBILITY', m.scores.mobility],
                        ['RECOVERY', m.scores.recovery],
                      ] as const).map(([sub, v]) => (
                        <Grid key={sub} size={4}>
                          <Gonio pct={v / 100} size={108} label={v} sub={sub} />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                <Grid container spacing={2}>
                  {MUSCLES.map((mu) => {
                    const pv = prevMeas.find((x: any) => x.muscleKey === mu.key)?.degrees;
                    const cur = meas.find((x: any) => x.muscleKey === mu.key)?.degrees;
                    const dl = pv !== undefined && cur !== undefined ? cur - pv : null;
                    return (
                      <Grid key={mu.key} size={{ xs: 6, sm: 4, md: 3 }}>
                        <TextField
                          type="number"
                          label={mu.label}
                          value={rom[mu.key] ?? ''}
                          onChange={(e) => setRom({ ...rom, [mu.key]: Number(e.target.value) })}
                          slotProps={{ htmlInput: { min: 0, max: mu.target } }}
                          helperText={
                            <Box component="span">
                              target {mu.target}°
                              {dl !== null && (
                                /* No red for a measured decrease — brass, matching the brand's
                                   "positive change in Optimal green, negative in brass" rule. */
                                <Box component="span" sx={{ color: dl >= 0 ? 'success.main' : 'primary.main', marginInlineStart: 1 }}>
                                  {dl >= 0 ? '+' : ''}{dl}
                                </Box>
                              )}
                            </Box>
                          }
                        />
                      </Grid>
                    );
                  })}
                </Grid>

                <Stack direction="row" spacing={1} sx={{ mt: 3, flexWrap: 'wrap' }}>
                  <Button variant="contained" onClick={() => act(
                    api('POST', `/members/${m.id}/assessments`, {
                      coachId, measurements: MUSCLES.map((mu) => ({ key: mu.key, value: rom[mu.key] ?? 0 })),
                    }, 'COACH'), 'Assessment saved — member view updated')}>Save assessment</Button>
                  <Button variant="outlined" onClick={() => act(
                    api('POST', '/integrations/bodymap/import', { memberId: m.id, coachId }, 'COACH'),
                    'BodyMap reading ingested')}>Import from BodyMap</Button>
                </Stack>
              </>
            ))}

            {panel(`Log session${todayBooking ? ` · ${todayBooking.time} ${service(todayBooking.serviceId).name}` : ''}`, (
              <>
                <Typography variant="overline" color="text.secondary">Modalities used</Typography>
                <FormGroup row sx={{ mb: 2 }}>
                  {MODALITIES.map((x) => (
                    <FormControlLabel
                      key={x}
                      control={
                        <Checkbox
                          checked={sform.modalities.includes(x)}
                          onChange={() => setSform({
                            ...sform,
                            modalities: sform.modalities.includes(x)
                              ? sform.modalities.filter((y) => y !== x)
                              : [...sform.modalities, x],
                          })}
                        />
                      }
                      label={<Typography variant="body2">{x}</Typography>}
                    />
                  ))}
                </FormGroup>

                <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField type="number" label="Duration (min)" value={sform.mins}
                               onChange={(e) => setSform({ ...sform, mins: Number(e.target.value) })} />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField type="number" label="Pain before" value={sform.painBefore}
                               slotProps={{ htmlInput: { min: 0, max: 10 } }}
                               onChange={(e) => setSform({ ...sform, painBefore: Number(e.target.value) })} />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <TextField type="number" label="Pain after" value={sform.painAfter}
                               slotProps={{ htmlInput: { min: 0, max: 10 } }}
                               onChange={(e) => setSform({ ...sform, painAfter: Number(e.target.value) })} />
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
                      RPE <Typography variant="readout" component="span" sx={{ fontSize: 'inherit' }}>{sform.rpe}</Typography>/10
                    </Typography>
                    <Slider value={sform.rpe} min={1} max={10} step={1} marks valueLabelDisplay="auto"
                            aria-label="Rate of perceived exertion" sx={{ paddingInline: 1 }}
                            onChange={(_, v) => setSform({ ...sform, rpe: v as number })} />
                  </Grid>
                </Grid>

                <TextField multiline minRows={3} sx={{ mt: 2 }} label="Coach notes — internal"
                           placeholder="What you found, what you worked, what to watch next time."
                           value={sform.coachNotes} onChange={(e) => setSform({ ...sform, coachNotes: e.target.value })} />
                <TextField multiline minRows={3} sx={{ mt: 2 }} label="Summary the member reads"
                           placeholder="Plain language. What we did, and what to do at home."
                           value={sform.memberSummary} onChange={(e) => setSform({ ...sform, memberSummary: e.target.value })} />

                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" disabled={!sform.memberSummary.trim()} onClick={() => act(
                    api('POST', '/sessions', { memberId: m.id, coachId, bookingId: todayBooking?.id || null, ...sform }, 'COACH'),
                    'Session logged — summary sent to member', true)}>Log session</Button>
                </Box>
              </>
            ))}

            {panel('Home programme', (
              <>
                {pgs.length ? (
                  <>
                    <Typography variant="h5">{pgs[0].title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {pgs[0].moves.length} moves · {pgs[0].completions.length} completions logged
                    </Typography>
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">None assigned.</Typography>
                )}
                <TextField sx={{ mt: 2 }} label="Programme title" placeholder="e.g. Desk Reset — Block 3"
                           value={pgTitle} onChange={(e) => setPgTitle(e.target.value)} />
                <Box sx={{ mt: 2 }}>
                  <Button variant="outlined" onClick={() => act(
                    api('POST', `/members/${m.id}/programs`, {
                      title: pgTitle || 'Desk Reset — Block 3', coachId,
                      moves: [
                        { n: 'Couch stretch', d: '2 × 45s per side' },
                        { n: '90/90 hip switch', d: '8 slow reps' },
                        { n: 'Thoracic opener over roller', d: '60s' },
                      ],
                    }, 'COACH').then(() => setPgTitle('')), 'Programme sent to member')}>
                    Prescribe standard desk block
                  </Button>
                </Box>
              </>
            ))}

            {panel(`History · ${sess.length} sessions`, (
              <Stack spacing={1}>
                {sess.length ? sess.slice(0, 10).map((s: any) => (
                  <Paper key={s.id} variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <Typography variant="subtitle2">{s.completedAt} · {s.mins} min</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {coachNameOf(s.coachId)} · RPE {s.rpe} · pain {s.painBefore}→{s.painAfter}
                      </Typography>
                    </Stack>
                    {s.coachNotes && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{s.coachNotes}</Typography>
                    )}
                  </Paper>
                )) : <Typography variant="body2" color="text.secondary">No sessions logged.</Typography>}
              </Stack>
            ))}
          </Stack>
        </Box>
      </Drawer>
    );
  };

  return (
    /* Chrome gets the unscoped snapshot on purpose: its segment switcher needs
       a member/coach id to open the other consoles with. Everything the coach
       console itself renders comes from the scoped `snap`. */
    <Chrome current="coach" currentId={coachId} label={coachName} snap={rawSnap} refresh={refresh} msg={msg}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Tabs value={view} onChange={(_, v) => setView(v)} variant="scrollable" allowScrollButtonsMobile
              sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Tab value="today" label="Today" />
          <Tab value="members" label="Members" />
          <Tab value="requests" label={
            <Badge color="error" badgeContent={pending.length} sx={{ paddingInlineEnd: pending.length ? 2 : 0 }}>
              Requests
            </Badge>
          } />
        </Tabs>

        <Fade in key={view} timeout={220}>
          <Box>
            {view === 'today' && renderToday()}
            {view === 'members' && renderMembers()}
            {view === 'requests' && renderRequests()}
          </Box>
        </Fade>
      </Container>

      {open && renderDrawer()}
    </Chrome>
  );
}
