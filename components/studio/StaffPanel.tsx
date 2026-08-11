'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import { createStaffAccount } from '@/lib/actions/staff';
import { assignShift } from '@/lib/actions/shifts';
import { EmptyState, SectionCard, formatDay, useFormSubmit } from './primitives';
import type { Shift, StaffMember } from './types';

const todayIso = () => new Date().toISOString().slice(0, 10);

const ROLE_LABEL: Record<StaffMember['role'], string> = {
  coach: 'Coach',
  studio_manager: 'Studio manager',
};

/* Who works here and when. Shift assignment is studio-manager-only
   (docs/adr/0008), and this form is the only way a staff login gets created
   after the one-time bootstrap seed. */
export default function StaffPanel({ staff, shifts }: { staff: StaffMember[]; shifts: Shift[] }) {
  const { pending, error, notice, setError, setNotice, run } = useFormSubmit();
  const [shiftStaffId, setShiftStaffId] = useState('');
  const [shiftDate, setShiftDate] = useState(todayIso);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffMember['role']>('coach');

  const staffNames = new Map(staff.map((s) => [s.id, s.name]));
  const assignable = staff.filter((s) => s.active);

  const onAssignShift = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      'Shift assigned.',
      () => assignShift({ staffId: shiftStaffId, date: shiftDate, startTime, endTime }),
      () => {
        setShiftStaffId('');
        setStartTime('');
        setEndTime('');
      },
    );
  };

  const onCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      'Staff account created.',
      () => createStaffAccount({ name, email, password, role }),
      () => {
        setName('');
        setEmail('');
        setPassword('');
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
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3}>
            <SectionCard title="Staff at this site" subtitle="Everyone who can sign in here.">
              {staff.length === 0 ? (
                <EmptyState message="No staff accounts yet. Create one to put a coach on the floor." />
              ) : (
                <TableContainer>
                  <Table size="small" sx={{ minWidth: 400 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {staff.map((s) => (
                        <TableRow key={s.id} hover>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{ROLE_LABEL[s.role]}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              variant="outlined"
                              color={s.active ? 'primary' : 'default'}
                              label={s.active ? 'Active' : 'Inactive'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </SectionCard>

            <SectionCard title="Upcoming shifts" subtitle="Today onward, in order.">
              {shifts.length === 0 ? (
                <EmptyState message="No shifts assigned yet. Assign one to set who is covering the floor." />
              ) : (
                <TableContainer>
                  <Table size="small" sx={{ minWidth: 400 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Staff</TableCell>
                        <TableCell>Start</TableCell>
                        <TableCell>End</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shifts.map((shift) => (
                        <TableRow key={shift.id} hover>
                          <TableCell>{formatDay(shift.date)}</TableCell>
                          <TableCell>{staffNames.get(shift.staffId) ?? 'Unknown staff'}</TableCell>
                          <TableCell>{shift.startTime}</TableCell>
                          <TableCell>{shift.endTime}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={3}>
            <SectionCard title="Assign a shift">
              <Stack component="form" spacing={2} onSubmit={onAssignShift}>
                <TextField
                  select
                  required
                  size="small"
                  label="Staff member"
                  value={shiftStaffId}
                  onChange={(e) => setShiftStaffId(e.target.value)}
                >
                  {assignable.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {`${s.name} — ${ROLE_LABEL[s.role]}`}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  required
                  size="small"
                  type="date"
                  label="Date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    required
                    size="small"
                    type="time"
                    label="Starts"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ flexGrow: 1 }}
                  />
                  <TextField
                    required
                    size="small"
                    type="time"
                    label="Ends"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ flexGrow: 1 }}
                  />
                </Stack>
                <Button type="submit" variant="contained" disabled={pending}>
                  {pending ? 'Saving…' : 'Assign shift'}
                </Button>
              </Stack>
            </SectionCard>

            <SectionCard title="New staff account" subtitle="Creates the sign-in for a coach or another manager at this site.">
              <Stack component="form" spacing={2} onSubmit={onCreateStaff}>
                <TextField
                  required
                  size="small"
                  label="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <TextField
                  required
                  size="small"
                  type="email"
                  label="Email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                  required
                  size="small"
                  type="password"
                  label="Temporary password"
                  autoComplete="new-password"
                  helperText="At least 8 characters. Hand it to them in person."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <TextField
                  select
                  required
                  size="small"
                  label="Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as StaffMember['role'])}
                >
                  <MenuItem value="coach">{ROLE_LABEL.coach}</MenuItem>
                  <MenuItem value="studio_manager">{ROLE_LABEL.studio_manager}</MenuItem>
                </TextField>
                <Button type="submit" variant="outlined" disabled={pending}>
                  {pending ? 'Saving…' : 'Create account'}
                </Button>
              </Stack>
            </SectionCard>
          </Stack>
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
