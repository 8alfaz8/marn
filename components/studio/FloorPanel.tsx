'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
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
import { createBooking, declineBooking } from '@/lib/actions/bookings';
import { SERVICES, serviceById } from '@/lib/reference';
import { copy } from './copy';
import { BookingStatusChip, EmptyState, SectionCard, formatNumber, useFormSubmit } from './primitives';
import type { Booking, Member, StaffMember } from './types';

const todayIso = () => new Date().toISOString().slice(0, 10);

/* Today's floor: what is booked, and the intake form for the next call or
   walk-in. Side by side on a desk screen because manual booking is the thing
   a manager does most often through the day (docs/adr/0008). */
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

  const service = serviceById(serviceId);
  // The dashboard read returns today's bookings unordered; the floor is read
  // top-to-bottom as the day runs, so order them here rather than adding a
  // second query for the same rows.
  const byTime = [...schedule].sort((a, b) => a.time.localeCompare(b.time));
  const memberNames = new Map(members.map((m) => [m.id, m.name]));
  const staffNames = new Map(staff.map((s) => [s.id, s.name]));
  const canBook = members.length > 0 && coaches.length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;
    run(
      copy.booking.confirmed,
      () => createBooking({ memberId, coachId, serviceId, date, time, aed: service.aed }),
      () => {
        setMemberId('');
        setTime('');
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
          <SectionCard title={copy.floor.heading} subtitle={copy.floor.subtitle}>
            {schedule.length === 0 ? (
              <EmptyState message={copy.floor.empty} />
            ) : (
              <TableContainer>
                <Table size="small" sx={{ minWidth: 640 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{copy.floor.colTime}</TableCell>
                      <TableCell>{copy.floor.colMember}</TableCell>
                      <TableCell>{copy.floor.colService}</TableCell>
                      <TableCell>{copy.floor.colCoach}</TableCell>
                      <TableCell align="right">{copy.floor.colAed}</TableCell>
                      <TableCell>{copy.floor.colStatus}</TableCell>
                      <TableCell align="right">{copy.floor.colAction}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {byTime.map((booking) => (
                      <TableRow key={booking.id} hover>
                        <TableCell>{booking.time}</TableCell>
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
                          {(booking.status === 'confirmed' || booking.status === 'requested') && (
                            <Button
                              size="small"
                              disabled={pending}
                              onClick={() => run(copy.floor.declined, () => declineBooking(booking.id))}
                            >
                              {copy.floor.decline}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
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
                  onChange={(e) => setCoachId(e.target.value)}
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
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  {SERVICES.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Stack direction="row" spacing={2}>
                  <TextField
                    required
                    size="small"
                    type="date"
                    label={copy.booking.date}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ flexGrow: 1 }}
                  />
                  <TextField
                    required
                    size="small"
                    type="time"
                    label={copy.booking.time}
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ flexGrow: 1 }}
                  />
                </Stack>
                {service && (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {copy.booking.priceHint(service.mins, formatNumber(service.aed))}
                  </Typography>
                )}
                <Button type="submit" variant="contained" disabled={pending}>
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
