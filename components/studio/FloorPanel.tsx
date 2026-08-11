'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { createBooking, declineBooking, getDaySchedule, reassignCoach, rescheduleBooking } from '@/lib/actions/bookings';
import { SERVICES, serviceById } from '@/lib/reference';
import { bookingRange, minutesToTime } from '@/lib/scheduling';
import { copy } from './copy';
import DayTimeline from './DayTimeline';
import { BookingStatusChip, EmptyState, SectionCard, formatDay, formatNumber, useFormSubmit } from './primitives';
import TimeSlotPicker from './TimeSlotPicker';
import type { Booking, DaySchedule, Member, StaffMember } from './types';

const todayIso = () => new Date().toISOString().slice(0, 10);

function endTimeOf(booking: Booking) {
  const range = bookingRange(booking.serviceId, booking.time);
  return range ? minutesToTime(range.end) : '—';
}

/* Reschedule/reassign live in a Popover, not a modal — CLAUDE.md's density
   rule: a manager mid-desk-call should never be blocked by a full dialog for
   a two-field edit. Both share the parent's `run` so success/error surface
   through the one Alert/Snackbar this panel already has, rather than a
   second copy per row. Module scope — never nested inside FloorPanel's
   render body (CLAUDE.md's known trap). */
function RescheduleAction({
  booking,
  pending,
  run,
}: {
  booking: Booking;
  pending: boolean;
  run: ReturnType<typeof useFormSubmit>['run'];
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState(booking.time);

  return (
    <>
      <Button size="small" disabled={pending} onClick={(e) => setAnchorEl(e.currentTarget)}>
        {copy.floor.reschedule}
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Stack spacing={2} sx={{ p: 2, inlineSize: 300 }}>
          <TextField
            required
            size="small"
            type="date"
            label={copy.booking.date}
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setTime('');
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TimeSlotPicker
            coachId={booking.coachId ?? ''}
            serviceId={booking.serviceId}
            date={date}
            value={time}
            onChange={setTime}
            excludeBookingId={booking.id}
          />
          <Button
            variant="contained"
            size="small"
            disabled={pending || !time}
            onClick={() =>
              run(copy.floor.rescheduled, () => rescheduleBooking(booking.id, date, time), () => setAnchorEl(null))
            }
          >
            {copy.floor.moveSubmit}
          </Button>
        </Stack>
      </Popover>
    </>
  );
}

function ReassignAction({
  booking,
  coaches,
  pending,
  run,
}: {
  booking: Booking;
  coaches: StaffMember[];
  pending: boolean;
  run: ReturnType<typeof useFormSubmit>['run'];
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [coachId, setCoachId] = useState(booking.coachId ?? '');

  return (
    <>
      <Button size="small" disabled={pending} onClick={(e) => setAnchorEl(e.currentTarget)}>
        {copy.floor.reassign}
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Stack spacing={2} sx={{ p: 2, inlineSize: 240 }}>
          <TextField select size="small" label={copy.booking.coach} value={coachId} onChange={(e) => setCoachId(e.target.value)}>
            {coaches.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            size="small"
            disabled={pending || !coachId}
            onClick={() => run(copy.floor.reassigned, () => reassignCoach(booking.id, coachId), () => setAnchorEl(null))}
          >
            {copy.floor.reassignSubmit}
          </Button>
        </Stack>
      </Popover>
    </>
  );
}

/* The floor for whichever date the manager is viewing: what is booked and
   who is free, plus the intake form for the next call or walk-in. Side by
   side on a desk screen because manual booking is the thing a manager does
   most often through the day (docs/adr/0008). */
export default function FloorPanel({
  schedule,
  members,
  coaches,
  staff,
  onGoToTab,
}: {
  schedule: Booking[];
  members: Member[];
  coaches: StaffMember[];
  staff: StaffMember[];
  onGoToTab: (tab: number) => void;
}) {
  const { pending, error, notice, setError, setNotice, run } = useFormSubmit();
  const [memberId, setMemberId] = useState('');
  const [coachId, setCoachId] = useState('');
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [date, setDate] = useState(todayIso);
  const [time, setTime] = useState('');

  const [viewDate, setViewDate] = useState(todayIso);
  const [daySchedule, setDaySchedule] = useState<DaySchedule>({ bookings: schedule, shifts: [] });

  const refreshDay = () => {
    getDaySchedule(viewDate).then(setDaySchedule);
  };

  useEffect(() => {
    let cancelled = false;
    getDaySchedule(viewDate).then((result) => {
      if (!cancelled) setDaySchedule(result);
    });
    return () => {
      cancelled = true;
    };
  }, [viewDate]);

  const service = serviceById(serviceId);
  const byTime = [...daySchedule.bookings].sort((a, b) => a.time.localeCompare(b.time));
  const memberNames = new Map(members.map((m) => [m.id, m.name]));
  const staffNames = new Map(staff.map((s) => [s.id, s.name]));
  const canBook = members.length > 0 && coaches.length > 0;
  const viewDateLabel = formatDay(viewDate);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!service || !time) return;
    run(
      copy.booking.confirmed,
      () => createBooking({ memberId, coachId, serviceId, date, time, aed: service.aed }),
      () => {
        setMemberId('');
        setTime('');
        if (date === viewDate) refreshDay();
      },
    );
  };

  return (
    <Stack spacing={3}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <SectionCard title={copy.floor.heading} subtitle={copy.floor.subtitleFor(viewDateLabel)}>
              <Stack spacing={2}>
                <TextField
                  size="small"
                  type="date"
                  label={copy.floor.viewDate}
                  value={viewDate}
                  onChange={(e) => setViewDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ maxInlineSize: 200 }}
                />
                {daySchedule.bookings.length === 0 ? (
                  <EmptyState message={copy.floor.emptyFor(viewDateLabel)} />
                ) : (
                  <TableContainer>
                    <Table size="small" sx={{ minWidth: 720 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>{copy.floor.colTime}</TableCell>
                          <TableCell>{copy.floor.colEnd}</TableCell>
                          <TableCell>{copy.floor.colMember}</TableCell>
                          <TableCell>{copy.floor.colService}</TableCell>
                          <TableCell>{copy.floor.colCoach}</TableCell>
                          <TableCell align="right">{copy.floor.colAed}</TableCell>
                          <TableCell>{copy.floor.colStatus}</TableCell>
                          <TableCell align="right">{copy.floor.colAction}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {byTime.map((booking) => {
                          const active = booking.status === 'confirmed' || booking.status === 'requested';
                          return (
                            <TableRow key={booking.id} hover>
                              <TableCell>{booking.time}</TableCell>
                              <TableCell>{endTimeOf(booking)}</TableCell>
                              <TableCell>{memberNames.get(booking.memberId) ?? copy.floor.unknownMember}</TableCell>
                              <TableCell>{serviceById(booking.serviceId)?.name ?? booking.serviceId}</TableCell>
                              <TableCell>
                                {booking.coachId
                                  ? staffNames.get(booking.coachId) ?? copy.floor.unknownCoach
                                  : copy.floor.unassigned}
                              </TableCell>
                              <TableCell align="right">{formatNumber(booking.aed)}</TableCell>
                              <TableCell>
                                <BookingStatusChip status={booking.status} />
                              </TableCell>
                              <TableCell align="right">
                                {active && (
                                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                                    <RescheduleAction
                                      booking={booking}
                                      pending={pending}
                                      run={(msg, action, onSuccess) =>
                                        run(msg, action, () => {
                                          onSuccess?.();
                                          refreshDay();
                                        })
                                      }
                                    />
                                    {booking.coachId && (
                                      <ReassignAction
                                        booking={booking}
                                        coaches={coaches}
                                        pending={pending}
                                        run={(msg, action, onSuccess) =>
                                          run(msg, action, () => {
                                            onSuccess?.();
                                            refreshDay();
                                          })
                                        }
                                      />
                                    )}
                                    <Button
                                      size="small"
                                      disabled={pending}
                                      onClick={() => run(copy.floor.declined, () => declineBooking(booking.id), refreshDay)}
                                    >
                                      {copy.floor.decline}
                                    </Button>
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
            </SectionCard>

            <SectionCard title={copy.timeline.heading} subtitle={copy.timeline.subtitle}>
              <DayTimeline date={viewDate} coaches={coaches} bookings={daySchedule.bookings} shifts={daySchedule.shifts} />
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title={copy.booking.heading} subtitle={copy.booking.subtitle}>
            {!canBook ? (
              <EmptyState
                message={members.length === 0 ? copy.booking.noMembers : copy.booking.noCoaches}
              >
                <Button variant="contained" onClick={() => onGoToTab(members.length === 0 ? 2 : 1)}>
                  {members.length === 0 ? copy.booking.goToMembers : copy.booking.goToStaff}
                </Button>
              </EmptyState>
            ) : (
              <Stack component="form" spacing={2} onSubmit={onSubmit}>
                <TextField
                  select
                  required
                  size="small"
                  label={copy.booking.member}
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                >
                  {members.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  required
                  size="small"
                  label={copy.booking.coach}
                  value={coachId}
                  onChange={(e) => {
                    setCoachId(e.target.value);
                    setTime('');
                  }}
                >
                  {coaches.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  required
                  size="small"
                  label={copy.booking.service}
                  value={serviceId}
                  onChange={(e) => {
                    setServiceId(e.target.value);
                    setTime('');
                  }}
                >
                  {SERVICES.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  required
                  size="small"
                  type="date"
                  label={copy.booking.date}
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setTime('');
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {copy.booking.time}
                  </Typography>
                  <TimeSlotPicker coachId={coachId} serviceId={serviceId} date={date} value={time} onChange={setTime} />
                </Box>
                {service && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {copy.booking.priceHint(service.mins, formatNumber(service.aed))}
                  </Typography>
                )}
                <Button type="submit" variant="contained" disabled={pending || !time}>
                  {pending ? copy.form.saving : copy.booking.submit}
                </Button>
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
      <Snackbar
        open={notice !== null}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        message={notice ?? ''}
      />
    </Stack>
  );
}
