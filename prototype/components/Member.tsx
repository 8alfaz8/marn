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
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import TodayOutlinedIcon from '@mui/icons-material/TodayOutlined';
import AccessibilityNewOutlinedIcon from '@mui/icons-material/AccessibilityNewOutlined';
import SelfImprovementOutlinedIcon from '@mui/icons-material/SelfImprovementOutlined';
import PlayCircleOutlineOutlinedIcon from '@mui/icons-material/PlayCircleOutlineOutlined';
import Fade from '@mui/material/Fade';
import Chrome from './Chrome';
import ParqForm from './ParqForm';
import { PremiumCard } from './premium';
import { MemberBodySkeleton } from './skeletons';
import CheckinForm from './CheckinForm';
import { Gonio, BodyMap } from './Viz';
import {
  AmbientWash, BandChip, TodayScreen, ProgressScreen,
  SessionsListScreen, SessionDetailScreen, MobilityDetailScreen, SessionReportScreen,
} from './MemberScreens';
import { api, useSnapshot } from '@/lib/store';
import {
  MUSCLES, SERVICES, ADDONS, SITES, siteById,
  muscle, service, addon, colorOf, iso, addDays, todayIso,
} from '@/lib/reference';

/* ---------------------------------------------------------------------------
   Member surface.

   Self-contained: it owns the snapshot poll, its own toast, and the Chrome
   wrapper. app/member/page.tsx only hands it the id off the session cookie.

   Bottom nav is the brand handoff's three tabs — Today, Progress, Sessions —
   plus Body map and Home programme as two more tabs alongside them
   (`components/MemberScreens.tsx` implements the five brand screens; body
   map/home programme render via this file's own `renderBody`/`renderHome`).
   Booking is a full-screen view opened from Today's "Book" button or the
   Sessions tab, not a tab of its own. See prototype/decisions.md.

   STRUCTURE RULE (CLAUDE.md "Known trap"): nothing that renders is defined
   inside this component's body. The tab/overlay views below are plain
   functions that return JSX and are *called*, never mounted as <View />, so
   the five-second poll can never remount them and drop scroll position or
   in-progress input. The five brand screens themselves live in
   MemberScreens.tsx as genuine module-scope components (imported, stable
   identity) since they're substantial enough to want their own file.
--------------------------------------------------------------------------- */

type MemberTab = 'today' | 'progress' | 'sessions' | 'body' | 'home';
type SessionsView = { view: 'list' } | { view: 'detail' | 'mobility' | 'report'; sessionId: string };

const TABS: { key: MemberTab; label: string; icon: React.ReactNode }[] = [
  { key: 'today', label: 'Today', icon: <TodayOutlinedIcon /> },
  { key: 'progress', label: 'Progress', icon: <ShowChartOutlinedIcon /> },
  { key: 'sessions', label: 'Sessions', icon: <EventAvailableOutlinedIcon /> },
  { key: 'body', label: 'Body map', icon: <AccessibilityNewOutlinedIcon /> },
  { key: 'home', label: 'Home', icon: <SelfImprovementOutlinedIcon /> },
];

const EMPTY_SNAP = {
  members: [], coaches: [], measurements: [], assessments: [],
  scoreDays: [], sessions: [], programs: [], bookings: [], checkins: [],
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;
/* Measured change, not sentiment: jade (optimal) for gained range. No red for
 * a loss — brass, matching the brand's "positive change in Optimal green,
 * negative in brass" rule (nothing in the status-band set reads as alarm). */
const changeColor = (n: number) => (n >= 0 ? 'success.main' : 'primary.main');
const statusChipColor = (s: string): 'secondary' | 'success' | 'default' =>
  (s === 'confirmed' ? 'secondary' : s === 'completed' ? 'success' : 'default');

/* ---------- module-scope presentational pieces ---------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Typography variant="overline" component="div" sx={{ color: 'text.secondary' }}>{children}</Typography>;
}

function PageTitle({ eyebrow, title, onBack }: { eyebrow: string; title: string; onBack?: () => void }) {
  return (
    <Box sx={{ mb: 1 }}>
      {onBack && (
        <IconButton size="small" onClick={onBack} sx={{ border: '1px solid', borderColor: 'divider', mb: 1.5 }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
      )}
      <Eyebrow>{eyebrow}</Eyebrow>
      <Typography variant="h3" sx={{ mt: 0.5 }}>{title}</Typography>
    </Box>
  );
}

/** Placeholder for future in-house move video — a gradient tile with a play
 * glyph and the move's position number as a watermark, not a stock photo
 * (licensing risk, and it would clash with the brand system). Swap for a
 * real thumbnail once the video library exists. */
function MoveThumbnail({ n }: { n: number }) {
  return (
    <Box
      sx={{
        width: 56, height: 56, flexShrink: 0, borderRadius: (t) => `${t.marn.radius.sm}px`,
        backgroundImage: (t) => t.marn.ambientWash.home,
        backgroundColor: 'background.raised',
        border: '1px solid', borderColor: 'divider',
        display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden',
      }}
    >
      <Typography
        aria-hidden variant="overline"
        sx={{ position: 'absolute', insetInlineEnd: 4, insetBlockEnd: 2, fontSize: '1.1rem', color: 'text.disabled', opacity: 0.5 }}
      >
        {n}
      </Typography>
      <PlayCircleOutlineOutlinedIcon sx={{ color: 'primary.main', fontSize: 26 }} />
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
  const { data: snap, error, refresh } = useSnapshot({ kind: 'member', id: memberId });

  const [msg, setMsg] = useState<string | null>(null);
  const toast = (s: string) => { setMsg(s); setTimeout(() => setMsg(null), 2800); };

  const [tab, setTab] = useState<MemberTab>('today');
  const [sessionsView, setSessionsView] = useState<SessionsView>({ view: 'list' });
  const [sel, setSel] = useState('hamstrings');
  const [draft, setDraft] = useState<{ svc: string; siteId: string; date: string; slot: string | null; addons: string[] }>(
    { svc: 'st30', siteId: '', date: todayIso(), slot: null, addons: [] });
  const [slots, setSlots] = useState<any[]>([]);
  const [bookOpen, setBookOpen] = useState(false);
  const [bookPicker, setBookPicker] = useState(false);
  const [parqOpen, setParqOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [referral, setReferral] = useState<string | null>(null);

  const s: any = snap ?? EMPTY_SNAP;

  const me = s.members.find((m: any) => m.id === memberId);
  const meas = s.measurements.filter((m: any) => m.assessmentId === me?.latestAssessmentId);
  const assessment = s.assessments.find((a: any) => a.id === me?.latestAssessmentId);
  const prevAssessment = s.assessments.filter((a: any) => a.memberId === memberId)[1];
  const prevMeas = s.measurements.filter((m: any) => m.assessmentId === prevAssessment?.id);
  const sessions = s.sessions.filter((x: any) => x.memberId === memberId);
  const programs = s.programs.filter((p: any) => p.memberId === memberId);
  const myBookings = s.bookings.filter((b: any) => b.memberId === memberId && !['cancelled', 'completed'].includes(b.status));
  const coachName = (id: string | null) => s.coaches.find((c: any) => c.id === id)?.name || 'Coach to be assigned';
  const siteName = siteById(me?.siteId)?.name || 'Studio';
  // Members can book any studio (docs/adr/0018) — the booking draft defaults
  // to home site until the member picks another one in renderBookPicker.
  const bookSiteId = draft.siteId || me?.siteId || SITES[0].id;

  useEffect(() => {
    if (!bookPicker) return;
    api('GET', `/availability?date=${draft.date}&serviceId=${draft.svc}&siteId=${bookSiteId}`, undefined, 'MEMBER')
      .then((r) => setSlots(r.slots)).catch(() => setSlots([]));
  }, [bookPicker, draft.date, draft.svc, bookSiteId]);

  /* ---------- actions ---------- */

  const act = async (p: Promise<any>, ok: string) => {
    try { await p; toast(ok); refresh('MEMBER'); }
    catch (e: any) { toast(e?.error || 'Failed'); }
  };

  const book = async () => {
    try {
      const r = await api('POST', '/bookings',
        { memberId, serviceId: draft.svc, siteId: bookSiteId, date: draft.date, time: draft.slot, addons: draft.addons }, 'MEMBER');
      toast(r.message);
      setDraft({ ...draft, slot: null });
      setBookPicker(false);
      setBookOpen(false);
      refresh('MEMBER');
    } catch (e: any) { toast(e?.error || 'Could not book'); }
  };

  const onParqCleared = () => {
    setReferral(null);
    setParqOpen(false);
    toast('Screening complete — you can book now');
    refresh('MEMBER');
  };

  const openTab = (t: MemberTab) => {
    setTab(t);
    setBookOpen(false); setBookPicker(false);
    setSessionsView({ view: 'list' });
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

  const renderBody = () => {
    if (!meas.length) {
      return (
        <Stack spacing={2}>
          <PageTitle eyebrow="Range of motion" title="Body map" onBack={() => openTab('today')} />
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
          onBack={() => openTab('today')}
        />

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: (t) => `${t.marn.radius.lg}px` }}>
          <Eyebrow>Whole-body map</Eyebrow>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid size={6}>
              <Typography variant="overline" align="center" sx={{ display: 'block', color: 'text.secondary' }}>Front</Typography>
              <BodyMap face="front" measurements={meas} selected={sel} onSelect={setSel} />
            </Grid>
            <Grid size={6}>
              <Typography variant="overline" align="center" sx={{ display: 'block', color: 'text.secondary' }}>Back</Typography>
              <BodyMap face="back" measurements={meas} selected={sel} onSelect={setSel} />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
            {(['restricted', 'limited', 'optimal', 'excellent'] as const).map((b) => <BandChip key={b} band={b} />)}
          </Stack>

          <Divider sx={{ my: 2.5 }} />

          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 7 }}>
              <Eyebrow>{info.region} region</Eyebrow>
              <Typography variant="h4" sx={{ mt: 0.5, mb: 1 }}>{info.label}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{info.note}</Typography>
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
        </Paper>

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

  const renderHome = () => (
    <Stack spacing={2}>
      <PageTitle eyebrow="Prescribed by your coach" title="Home programme" onBack={() => openTab('today')} />
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
                <Box key={i} sx={{ display: 'flex', gap: 2, py: 1, alignItems: 'center', borderBlockStart: i ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <MoveThumbnail n={i + 1} />
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

  const renderBookingsList = () => (
    <Stack spacing={2}>
      <PageTitle eyebrow={siteName} title="Book a session" onBack={() => setBookOpen(false)} />
      {parqCallout()}
      {myBookings.length ? (
        <Stack spacing={1.5}>
          {[...myBookings].sort((a: any, b: any) => (a.date + a.time).localeCompare(b.date + b.time)).map((b: any) => (
            <PremiumCard key={b.id} sx={{ p: 2.5 }}>
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
            </PremiumCard>
          ))}
        </Stack>
      ) : (
        <EmptyPanel>No upcoming bookings yet.</EmptyPanel>
      )}
      <Button variant="contained" size="large" onClick={() => setBookPicker(true)}>Book a slot</Button>
    </Stack>
  );

  const renderBookPicker = () => {
    const sv = service(draft.svc);
    const total = sv.aed + draft.addons.reduce((n, a) => n + addon(a).aed, 0);
    const dates = [...Array(7)].map((_, i) => addDays(new Date(), i));

    return (
      <Stack spacing={2}>
        <PageTitle eyebrow={siteById(bookSiteId)?.name ?? siteName} title="Book a session" onBack={() => setBookPicker(false)} />

        {parqCallout()}

        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Eyebrow>Studio</Eyebrow>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={bookSiteId}
            onChange={(_, v) => v && setDraft({ ...draft, siteId: v, slot: null })}
            sx={{ mt: 1, flexWrap: 'wrap', borderRadius: (t) => `${t.marn.radius.lg}px` }}
          >
            {SITES.map((x) => (
              <ToggleButton key={x.id} value={x.id}>{x.name.replace('Marn — ', '')}</ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Box sx={{ mt: 3 }}>
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
                  <Typography
                    variant="body2"
                    sx={{
                      textTransform: 'none',
                      color: x.id === draft.svc ? (t) => alpha(t.palette.primary.contrastText, 0.8) : 'text.secondary',
                    }}
                  >
                    {x.mins} min · {x.desc}
                  </Typography>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Eyebrow>Date</Eyebrow>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={draft.date}
              onChange={(_, v) => v && setDraft({ ...draft, date: v, slot: null })}
              sx={{ mt: 1, flexWrap: 'wrap', borderRadius: (t) => `${t.marn.radius.lg}px` }}
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
                sx={{ mt: 1, flexWrap: 'wrap', borderRadius: (t) => `${t.marn.radius.lg}px` }}
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

  const renderSessions = () => {
    if (sessionsView.view === 'list') {
      return (
        <SessionsListScreen
          snap={s}
          memberId={memberId}
          myBookings={myBookings}
          onOpenSession={(id) => setSessionsView({ view: 'detail', sessionId: id })}
          onOpenBooking={() => setBookOpen(true)}
        />
      );
    }
    const session = sessions.find((x: any) => x.id === sessionsView.sessionId);
    if (!session) {
      return (
        <SessionsListScreen
          snap={s} memberId={memberId} myBookings={myBookings}
          onOpenSession={(id) => setSessionsView({ view: 'detail', sessionId: id })}
          onOpenBooking={() => setBookOpen(true)}
        />
      );
    }

    if (sessionsView.view === 'detail') {
      return (
        <SessionDetailScreen
          snap={s} memberId={memberId} session={session}
          onBack={() => setSessionsView({ view: 'list' })}
          onOpenMobility={() => setSessionsView({ view: 'mobility', sessionId: session.id })}
          onOpenReport={() => setSessionsView({ view: 'report', sessionId: session.id })}
        />
      );
    }
    if (sessionsView.view === 'mobility') {
      return <MobilityDetailScreen session={session} onBack={() => setSessionsView({ view: 'detail', sessionId: session.id })} />;
    }
    return <SessionReportScreen snap={s} memberId={memberId} session={session} onBack={() => setSessionsView({ view: 'detail', sessionId: session.id })} />;
  };

  const body = () => {
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!snap) return <MemberBodySkeleton />;
    if (!me) return <Alert severity="error">We could not find that member account.</Alert>;

    if (bookOpen) return bookPicker ? renderBookPicker() : renderBookingsList();

    switch (tab) {
      case 'today':
        return (
          <>
            {parqCallout()}
            <TodayScreen
              snap={s} memberId={memberId}
              onOpenBody={() => openTab('body')}
              onOpenBooking={() => setBookOpen(true)}
              onOpenCheckin={() => setCheckinOpen(true)}
            />
          </>
        );
      case 'progress':
        return <ProgressScreen snap={s} memberId={memberId} />;
      case 'sessions':
        return renderSessions();
      case 'body':
        return renderBody();
      case 'home':
        return renderHome();
    }
  };

  return (
    <Chrome current="member" currentId={memberId} label={me?.name ?? 'Member'} snap={snap ?? EMPTY_SNAP} refresh={refresh} msg={msg}>
      <AmbientWash tab={tab}>
        <Container
          maxWidth="sm"
          sx={{ py: 3, paddingBlockEnd: (t) => `calc(${t.spacing(12)} + env(safe-area-inset-bottom))` }}
        >
          <Fade in key={`${tab}-${bookOpen}-${bookPicker}-${sessionsView.view}`} timeout={220}>
            <Box>{body()}</Box>
          </Fade>
        </Container>
      </AmbientWash>

      <Paper
        variant="outlined"
        sx={{
          position: 'fixed', insetBlockEnd: 0, insetInline: 0,
          zIndex: (t) => t.zIndex.appBar,
          borderRadius: 0, borderBlockEnd: 'none', borderInline: 'none',
          bgcolor: (t) => alpha(t.palette.background.default, 0.86),
          backdropFilter: 'blur(12px)',
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavigation showLabels value={tab} onChange={(_, v) => openTab(v as MemberTab)}>
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
