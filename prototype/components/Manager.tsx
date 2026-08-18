'use client';
import { useState } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
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
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Popover from '@mui/material/Popover';
import Alert from '@mui/material/Alert';
import Fade from '@mui/material/Fade';
import { alpha } from '@mui/material/styles';
import Chrome from './Chrome';
import DayTimeline from './DayTimeline';
import TimeSlotPicker from './TimeSlotPicker';
import { PremiumCard } from './premium';
import { ConsoleSkeleton } from './skeletons';
import MembersList from './MembersList';
import { AmbientWash } from './MemberScreens';
import { api, useSnapshot } from '@/lib/store';
import { SERVICES, service, siteById, todayIso } from '@/lib/reference';

/* NOTE ON STRUCTURE — same convention as Coach.tsx: every piece of form
   state lives in this component or in a module-scope sibling, never in a
   function defined inside this component's body, because the 5-second
   snapshot poll re-renders this tree and an inline component would remount
   and drop whatever a manager was mid-typing (CLAUDE.md's "Known trap"). */

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

const statusChip = (status: string) =>
  status === 'completed' ? { color: 'success' as const, variant: 'filled' as const }
    : status === 'confirmed' ? { color: 'secondary' as const, variant: 'filled' as const }
      : { color: 'default' as const, variant: 'outlined' as const };

type Coach = { id: string; name: string; siteId: string; title: string };
type Snap = any;

/* Reschedule/reassign live in a Popover, not a modal — CLAUDE.md's coach-
   console density rule applies just as much to a manager mid-desk-call.
   Module scope, ported/adapted from the root product's FloorPanel. */
function RescheduleAction({ booking, onDone }: { booking: any; onDone: (msg: string) => void }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Button size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>Move</Button>
      <Popover open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Stack spacing={1.5} sx={{ p: 2, width: 300 }}>
          <TextField size="small" type="date" label="Date" value={date}
                     onChange={(e) => { setDate(e.target.value); setTime(''); }}
                     slotProps={{ inputLabel: { shrink: true } }} />
          <TimeSlotPicker coachId={booking.coachId ?? ''} serviceId={booking.serviceId} date={date} value={time} onChange={setTime} excludeBookingId={booking.id} />
          <Button variant="contained" size="small" disabled={busy || !time} onClick={async () => {
            setBusy(true);
            try {
              await api('POST', `/bookings/${booking.id}/reschedule`, { date, time }, 'MANAGER');
              onDone('Booking moved'); setAnchorEl(null);
            } catch (e: any) { onDone(e?.error || 'Could not move'); } finally { setBusy(false); }
          }}>Move</Button>
        </Stack>
      </Popover>
    </>
  );
}

function ReassignAction({ booking, coaches, onDone }: { booking: any; coaches: Coach[]; onDone: (msg: string) => void }) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [coachId, setCoachId] = useState(booking.coachId ?? '');
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Button size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>Reassign</Button>
      <Popover open={!!anchorEl} anchorEl={anchorEl} onClose={() => setAnchorEl(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Stack spacing={1.5} sx={{ p: 2, width: 240 }}>
          <TextField select size="small" label="Coach" value={coachId} onChange={(e) => setCoachId(e.target.value)}>
            {coaches.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <Button variant="contained" size="small" disabled={busy || !coachId} onClick={async () => {
            setBusy(true);
            try {
              await api('POST', `/bookings/${booking.id}/reassign`, { coachId }, 'MANAGER');
              onDone('Reassigned'); setAnchorEl(null);
            } catch (e: any) { onDone(e?.error || 'Could not reassign'); } finally { setBusy(false); }
          }}>Reassign</Button>
        </Stack>
      </Popover>
    </>
  );
}

/* Approve a pending request by assigning a coach — reuses the existing
   POST /bookings/:id/confirm endpoint (it already accepts a coachId), so a
   manager and a coach confirm through the same write path. Module scope,
   same reasoning as the actions above. */
function ApproveAction({ booking, coaches, onDone }: { booking: any; coaches: Coach[]; onDone: (msg: string) => void }) {
  const [coachId, setCoachId] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
      <TextField select size="small" label="Assign coach" value={coachId} onChange={(e) => setCoachId(e.target.value)} sx={{ minWidth: 200 }}>
        {coaches.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>
      <Button variant="contained" size="small" disabled={busy || !coachId} onClick={async () => {
        setBusy(true);
        try { await api('POST', `/bookings/${booking.id}/confirm`, { coachId }, 'MANAGER'); onDone('Confirmed — member notified'); }
        catch (e: any) { onDone(e?.error || 'Could not confirm'); } finally { setBusy(false); }
      }}>Confirm</Button>
      <Button size="small" disabled={busy} onClick={async () => {
        setBusy(true);
        try { await api('POST', `/bookings/${booking.id}/decline`, { reason: 'No coach available' }, 'MANAGER'); onDone('Declined — member notified'); }
        catch (e: any) { onDone(e?.error || 'Could not decline'); } finally { setBusy(false); }
      }}>Decline</Button>
    </Stack>
  );
}

export default function Manager({ managerId }: { managerId: string }) {
  const { data: snap, error, refresh }: { data: Snap; error: string | null; refresh: () => void } =
    useSnapshot({ kind: 'manager', id: managerId });

  const [msg, setMsg] = useState<string | null>(null);
  const toast = (s: string) => { setMsg(s); setTimeout(() => setMsg(null), 2800); };
  const bump = (s: string) => { toast(s); refresh(); };

  const [view, setView] = useState<'floor' | 'requests' | 'staff' | 'members'>('floor');
  const [viewDate, setViewDate] = useState(todayIso());

  const [intake, setIntake] = useState({ memberId: '', coachId: '', serviceId: SERVICES[0].id, date: todayIso(), time: '' });
  const [shiftForm, setShiftForm] = useState({ coachId: '', date: todayIso(), startTime: '', endTime: '' });
  const [newCoachName, setNewCoachName] = useState('');
  const [newMember, setNewMember] = useState({ name: '', phone: '', goal: '', parqCleared: false });

  if (!snap) {
    if (error) {
      return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
          <Alert severity="error">{error}. The console reloads on its own once the API answers.</Alert>
        </Container>
      );
    }
    return <ConsoleSkeleton tabs={4} />;
  }

  const mgr = snap.managers.find((m: any) => m.id === managerId);
  const mgrName = mgr?.name || 'Manager';
  const siteId = mgr?.siteId || 's1';
  const siteName = siteById(siteId)?.name || 'Studio';

  const coaches: Coach[] = snap.coaches;
  const memberOf = (id: string) => snap.members.find((m: any) => m.id === id);
  const coachNameOf = (id: string | null) => coaches.find((c) => c.id === id)?.name || '—';

  const pending = snap.bookings.filter((b: any) => b.status === 'requested');
  const dayBookings = snap.bookings.filter((b: any) => b.date === viewDate && b.status !== 'cancelled');
  const dayShifts = snap.shifts.filter((s: any) => s.date === viewDate);

  const act = async (p: Promise<any>, message: string, after?: () => void) => {
    try { await p; toast(message); refresh(); after?.(); }
    catch (e: any) { toast(e?.error || 'Failed'); }
  };

  const head = (eyebrow: string, title: string, stats: { label: string; value: number | string }[] = []) => (
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

  const panel = (eyebrow: string, children: React.ReactNode) => (
    <PremiumCard sx={{ p: 3, height: '100%' }}>
      <Typography variant="overline" color="text.secondary">{eyebrow}</Typography>
      <Box sx={{ mt: 2 }}>{children}</Box>
    </PremiumCard>
  );

  /* ---------------- Floor ---------------- */

  const renderFloor = () => (
    <>
      {head(`${siteName} · floor`, 'Schedule & shifts', [
        { label: 'Booked today', value: snap.bookings.filter((b: any) => b.date === todayIso() && b.status !== 'cancelled').length },
        { label: 'Coaches', value: coaches.length },
        { label: 'Members', value: snap.members.length },
        { label: 'Awaiting reply', value: pending.length },
      ])}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2}>
            {panel('Viewing date', (
              <Stack spacing={2}>
                <TextField size="small" type="date" label="Date" value={viewDate}
                           onChange={(e) => setViewDate(e.target.value)}
                           slotProps={{ inputLabel: { shrink: true } }} sx={{ maxWidth: 200 }} />
                {dayBookings.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Nothing booked on {fmtDate(viewDate)}.</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Time</TableCell><TableCell>Member</TableCell><TableCell>Service</TableCell>
                          <TableCell>Coach</TableCell><TableCell align="right">AED</TableCell><TableCell>Status</TableCell><TableCell align="right" />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {[...dayBookings].sort((a: any, b: any) => a.time.localeCompare(b.time)).map((b: any) => {
                          const m = memberOf(b.memberId);
                          const active = b.status === 'confirmed' || b.status === 'requested';
                          return (
                            <TableRow key={b.id} hover>
                              <TableCell>{b.time}</TableCell>
                              <TableCell>{m?.name || 'Unknown member'}</TableCell>
                              <TableCell>{service(b.serviceId)?.name}</TableCell>
                              <TableCell>{coachNameOf(b.coachId)}</TableCell>
                              <TableCell align="right">{b.aed}</TableCell>
                              <TableCell><Chip size="small" label={b.status} {...statusChip(b.status)} /></TableCell>
                              <TableCell align="right">
                                {active && (
                                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                                    <RescheduleAction booking={b} onDone={bump} />
                                    {b.coachId && <ReassignAction booking={b} coaches={coaches} onDone={bump} />}
                                  </Stack>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            ))}

            {panel('Coach timeline', <DayTimeline coaches={coaches} bookings={dayBookings} shifts={dayShifts} />)}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          {panel('Book a walk-in or call-in', (
            <Stack spacing={2}>
              <TextField select size="small" label="Member" value={intake.memberId}
                         onChange={(e) => setIntake({ ...intake, memberId: e.target.value })}>
                {snap.members.map((m: any) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Coach" value={intake.coachId}
                         onChange={(e) => setIntake({ ...intake, coachId: e.target.value, time: '' })}>
                {coaches.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Service" value={intake.serviceId}
                         onChange={(e) => setIntake({ ...intake, serviceId: e.target.value, time: '' })}>
                {SERVICES.map((s) => <MenuItem key={s.id} value={s.id}>{s.name} · {s.mins} min · AED {s.aed}</MenuItem>)}
              </TextField>
              <TextField size="small" type="date" label="Date" value={intake.date}
                         onChange={(e) => setIntake({ ...intake, date: e.target.value, time: '' })}
                         slotProps={{ inputLabel: { shrink: true } }} />
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>Time</Typography>
                <TimeSlotPicker coachId={intake.coachId} serviceId={intake.serviceId} date={intake.date} value={intake.time}
                                 onChange={(time) => setIntake({ ...intake, time })} />
              </Box>
              <Button variant="contained" disabled={!intake.memberId || !intake.coachId || !intake.time} onClick={() => act(
                api('POST', '/bookings/manual', intake, 'MANAGER'),
                'Booked and confirmed',
                () => { setIntake({ ...intake, memberId: '', time: '' }); if (intake.date === viewDate) refresh(); },
              )}>Book</Button>
              {snap.members.length === 0 && (
                <Typography variant="body2" color="text.secondary">Add a member first, on the Members tab.</Typography>
              )}
            </Stack>
          ))}
        </Grid>
      </Grid>
    </>
  );

  /* ---------------- Requests ---------------- */

  const renderRequests = () => (
    <>
      {head('Inbox', 'Requests')}
      <Stack spacing={2} sx={{ maxWidth: 900 }}>
        {pending.length ? pending.map((b: any) => {
          const m = memberOf(b.memberId);
          return (
            <PremiumCard key={b.id} sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}>
                <Box>
                  <Typography variant="overline" color="text.secondary">{fmtDate(b.date)} · {b.time}</Typography>
                  <Typography variant="h5" sx={{ mt: 0.5 }}>{m?.name || 'Unknown member'} · {service(b.serviceId)?.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{service(b.serviceId)?.mins} min · AED {b.aed}</Typography>
                </Box>
                <ApproveAction booking={b} coaches={coaches} onDone={bump} />
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

  /* ---------------- Staff ---------------- */

  const renderStaff = () => (
    <>
      {head('Your floor', 'Staff & shifts')}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={2}>
            {panel('Coaches', (
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Coach</TableCell><TableCell>Title</TableCell></TableRow></TableHead>
                  <TableBody>
                    {coaches.map((c) => (
                      <TableRow key={c.id}><TableCell>{c.name}</TableCell><TableCell><Typography variant="body2" color="text.secondary">{c.title}</Typography></TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ))}
            {panel('Upcoming shifts', (
              snap.shifts.filter((s: any) => s.date >= todayIso()).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No shifts assigned yet.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Coach</TableCell><TableCell>Start</TableCell><TableCell>End</TableCell></TableRow></TableHead>
                    <TableBody>
                      {snap.shifts.filter((s: any) => s.date >= todayIso()).slice(0, 40).map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell>{fmtDate(s.date)}</TableCell><TableCell>{coachNameOf(s.coachId)}</TableCell>
                          <TableCell>{s.startTime}</TableCell><TableCell>{s.endTime}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )
            ))}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={2}>
            {panel('Assign a shift', (
              <Stack spacing={2}>
                <TextField select size="small" label="Coach" value={shiftForm.coachId}
                           onChange={(e) => setShiftForm({ ...shiftForm, coachId: e.target.value })}>
                  {coaches.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </TextField>
                <TextField size="small" type="date" label="Date" value={shiftForm.date}
                           onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                           slotProps={{ inputLabel: { shrink: true } }} />
                <Stack direction="row" spacing={2}>
                  <TextField size="small" type="time" label="Starts" value={shiftForm.startTime}
                             onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                             slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                  <TextField size="small" type="time" label="Ends" value={shiftForm.endTime}
                             onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                             slotProps={{ inputLabel: { shrink: true } }} sx={{ flex: 1 }} />
                </Stack>
                <Button variant="contained" disabled={!shiftForm.coachId || !shiftForm.startTime || !shiftForm.endTime} onClick={() => act(
                  api('POST', '/shifts', { ...shiftForm, siteId, managerId }, 'MANAGER'),
                  'Shift assigned',
                  () => setShiftForm({ ...shiftForm, startTime: '', endTime: '' }),
                )}>Assign shift</Button>
              </Stack>
            ))}

            {panel('Add a coach', (
              <Stack spacing={2}>
                <TextField size="small" label="Full name" value={newCoachName} onChange={(e) => setNewCoachName(e.target.value)} />
                <Button variant="outlined" disabled={!newCoachName.trim()} onClick={() => act(
                  api('POST', '/coaches', { name: newCoachName, siteId }, 'MANAGER'),
                  'Coach added',
                  () => setNewCoachName(''),
                )}>Add coach</Button>
              </Stack>
            ))}
          </Stack>
        </Grid>
      </Grid>
    </>
  );

  /* ---------------- Members ---------------- */

  const renderMembers = () => (
    <>
      {head('Your roster', 'Members', [{ label: 'Active', value: snap.members.length }])}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <MembersList site={siteId} />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          {panel('Add a member', (
            <Stack spacing={2}>
              <TextField size="small" label="Full name" value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} />
              <TextField size="small" label="Phone" placeholder="+971 5x xxx xxxx" value={newMember.phone} onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} />
              <TextField size="small" label="What they want to fix" value={newMember.goal} onChange={(e) => setNewMember({ ...newMember, goal: e.target.value })} />
              <FormControlLabel
                control={<Checkbox checked={newMember.parqCleared} onChange={(e) => setNewMember({ ...newMember, parqCleared: e.target.checked })} />}
                label={<Typography variant="body2">PAR-Q completed and cleared</Typography>}
              />
              <Button variant="contained" disabled={!newMember.name.trim()} onClick={() => act(
                api('POST', '/members', { ...newMember, siteId }, 'MANAGER'),
                'Member created',
                () => setNewMember({ name: '', phone: '', goal: '', parqCleared: false }),
              )}>Create member</Button>
            </Stack>
          ))}
        </Grid>
      </Grid>
    </>
  );

  return (
    <Chrome current="manager" currentId={managerId} label={mgrName} snap={snap} refresh={refresh} msg={msg}>
      <AmbientWash tab="manager">
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Box
            sx={{
              position: 'sticky', top: 'var(--marn-header-offset, 0px)', zIndex: (t) => t.zIndex.appBar,
              bgcolor: (t) => alpha(t.palette.background.default, 0.86), backdropFilter: 'blur(12px)',
              pt: 0, pb: 1, mb: 2,
            }}
          >
            <Tabs value={view} onChange={(_, v) => setView(v)} variant="scrollable" allowScrollButtonsMobile
                  sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
              <Tab value="floor" label="Floor" />
              <Tab value="requests" label={
                <Badge color="error" badgeContent={pending.length} sx={{ paddingInlineEnd: pending.length ? 2 : 0 }}>Requests</Badge>
              } />
              <Tab value="staff" label="Staff" />
              <Tab value="members" label="Members" />
            </Tabs>
          </Box>

          <Fade in key={view} timeout={220}>
            <Box>
              {view === 'floor' && renderFloor()}
              {view === 'requests' && renderRequests()}
              {view === 'staff' && renderStaff()}
              {view === 'members' && renderMembers()}
            </Box>
          </Fade>
        </Container>
      </AmbientWash>
    </Chrome>
  );
}
