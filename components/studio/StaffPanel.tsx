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
import CoachSessionHistoryDialog from '@/components/shared/CoachSessionHistoryDialog';
import { copy } from './copy';
import { EmptyState, SectionCard, formatDay, useFormSubmit } from './primitives';
import type { Shift, StaffMember } from './types';

const todayIso = () => new Date().toISOString().slice(0, 10);

const ROLE_LABEL: Record<StaffMember['role'], string> = {
  coach: copy.staff.roles.coach,
  studio_manager: copy.staff.roles.studio_manager,
  superadmin: copy.staff.roles.superadmin,
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
  // createStaffAccount is studio-manager-gated and site-scoped — this form
  // deliberately never offers 'superadmin'.
  const [role, setRole] = useState<'coach' | 'studio_manager'>('coach');
  const [selectedCoach, setSelectedCoach] = useState<{ id: string; name: string } | null>(null);

  const staffNames = new Map(staff.map((s) => [s.id, s.name]));
  const assignable = staff.filter((s) => s.active);

  const onAssignShift = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      copy.shifts.assigned,
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
      copy.newStaff.created,
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
            <SectionCard title={copy.staff.heading} subtitle={copy.staff.subtitle}>
              {staff.length === 0 ? (
                <EmptyState message={copy.staff.empty} />
              ) : (
                <TableContainer>
                  <Table size="small" sx={{ minWidth: 400 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>{copy.staff.colName}</TableCell>
                        <TableCell>{copy.staff.colRole}</TableCell>
                        <TableCell>{copy.staff.colStatus}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {staff.map((s) => (
                        <TableRow
                          key={s.id}
                          hover
                          onClick={() => s.role === 'coach' && setSelectedCoach({ id: s.id, name: s.name })}
                          sx={{ cursor: s.role === 'coach' ? 'pointer' : 'default' }}
                        >
                          <TableCell>{s.name}</TableCell>
                          <TableCell>{ROLE_LABEL[s.role]}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              variant="outlined"
                              color={s.active ? 'primary' : 'default'}
                              label={s.active ? copy.staff.active : copy.staff.inactive}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </SectionCard>

            <SectionCard title={copy.shifts.heading} subtitle={copy.shifts.subtitle}>
              {shifts.length === 0 ? (
                <EmptyState message={copy.shifts.empty} />
              ) : (
                <TableContainer>
                  <Table size="small" sx={{ minWidth: 400 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>{copy.shifts.colDate}</TableCell>
                        <TableCell>{copy.shifts.colStaff}</TableCell>
                        <TableCell>{copy.shifts.colStart}</TableCell>
                        <TableCell>{copy.shifts.colEnd}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shifts.map((shift) => (
                        <TableRow key={shift.id} hover>
                          <TableCell>{formatDay(shift.date)}</TableCell>
                          <TableCell>{staffNames.get(shift.staffId) ?? copy.shifts.unknownStaff}</TableCell>
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
            <SectionCard title={copy.shifts.assignHeading}>
              <Stack component="form" spacing={2} onSubmit={onAssignShift}>
                <TextField
                  select
                  required
                  size="small"
                  label={copy.shifts.staffMember}
                  value={shiftStaffId}
                  onChange={(e) => setShiftStaffId(e.target.value)}
                >
                  {assignable.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {copy.shifts.staffOption(s.name, ROLE_LABEL[s.role])}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  required
                  size="small"
                  type="date"
                  label={copy.shifts.date}
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Stack direction="row" spacing={2}>
                  <TextField
                    required
                    size="small"
                    type="time"
                    label={copy.shifts.starts}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ flexGrow: 1 }}
                  />
                  <TextField
                    required
                    size="small"
                    type="time"
                    label={copy.shifts.ends}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ flexGrow: 1 }}
                  />
                </Stack>
                <Button type="submit" variant="contained" disabled={pending}>
                  {pending ? copy.form.saving : copy.shifts.submit}
                </Button>
              </Stack>
            </SectionCard>

            <SectionCard title={copy.newStaff.heading} subtitle={copy.newStaff.subtitle}>
              <Stack component="form" spacing={2} onSubmit={onCreateStaff}>
                <TextField
                  required
                  size="small"
                  label={copy.newStaff.name}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <TextField
                  required
                  size="small"
                  type="email"
                  label={copy.newStaff.email}
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                  required
                  size="small"
                  type="password"
                  label={copy.newStaff.password}
                  autoComplete="new-password"
                  helperText={copy.newStaff.passwordHelper}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <TextField
                  select
                  required
                  size="small"
                  label={copy.newStaff.role}
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'coach' | 'studio_manager')}
                >
                  <MenuItem value="coach">{ROLE_LABEL.coach}</MenuItem>
                  <MenuItem value="studio_manager">{ROLE_LABEL.studio_manager}</MenuItem>
                </TextField>
                <Button type="submit" variant="outlined" disabled={pending}>
                  {pending ? copy.form.saving : copy.newStaff.submit}
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
      <CoachSessionHistoryDialog
        coachId={selectedCoach?.id ?? null}
        coachName={selectedCoach?.name ?? ''}
        onClose={() => setSelectedCoach(null)}
      />
    </Stack>
  );
}
