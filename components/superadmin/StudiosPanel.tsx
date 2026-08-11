'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
import { assignStaffToSite, createSite, createStaffAccountForSite } from '@/lib/actions/staff';
import { copy } from './copy';
import { EmptyState, SectionCard, useFormSubmit } from '@/components/studio/primitives';
import type { AllStaff, Site } from './types';

const ROLE_LABEL: Record<'coach' | 'studio_manager', string> = {
  coach: copy.studios.roleCoach,
  studio_manager: copy.studios.roleStudioManager,
};

/* Reassign is a row-level Popover, not a modal — same interaction pattern as
   components/studio/FloorPanel.tsx's RescheduleAction/ReassignAction.
   Module scope, per CLAUDE.md's known trap. */
function ReassignAction({
  staffMember,
  sites,
  pending,
  run,
}: {
  staffMember: AllStaff;
  sites: Site[];
  pending: boolean;
  run: ReturnType<typeof useFormSubmit>['run'];
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [siteId, setSiteId] = useState(staffMember.siteId ?? '');

  return (
    <>
      <Button size="small" disabled={pending} onClick={(e) => setAnchorEl(e.currentTarget)}>
        {copy.studios.reassign}
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Stack spacing={2} sx={{ p: 2, inlineSize: 260 }}>
          <TextField select size="small" label={copy.studios.reassignHeading} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            {sites.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            size="small"
            disabled={pending || !siteId}
            onClick={() =>
              run(copy.studios.reassigned, () => assignStaffToSite(staffMember.id, siteId), () => setAnchorEl(null))
            }
          >
            {copy.studios.reassignSubmit}
          </Button>
        </Stack>
      </Popover>
    </>
  );
}

export default function StudiosPanel({ sites, staff }: { sites: Site[]; staff: AllStaff[] }) {
  const { pending, error, notice, setError, setNotice, run } = useFormSubmit();
  const [siteName, setSiteName] = useState('');
  const [city, setCity] = useState('');
  const [staffName, setStaffName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'coach' | 'studio_manager'>('coach');
  const [staffSiteId, setStaffSiteId] = useState('');

  const siteNames = new Map(sites.map((s) => [s.id, s.name]));

  const onCreateSite = (e: React.FormEvent) => {
    e.preventDefault();
    run(copy.studios.created, () => createSite({ name: siteName, city }), () => {
      setSiteName('');
      setCity('');
    });
  };

  const onCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffSiteId) return;
    run(
      copy.studios.staffCreated,
      () => createStaffAccountForSite({ name: staffName, email, password, role, siteId: staffSiteId }),
      () => {
        setStaffName('');
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
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <SectionCard title={copy.studios.sitesHeading} subtitle={copy.studios.sitesSubtitle}>
              {sites.length === 0 ? (
                <EmptyState message={copy.studios.sitesEmpty} />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{copy.studios.colName}</TableCell>
                        <TableCell>{copy.studios.colCity}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sites.map((site) => (
                        <TableRow key={site.id} hover>
                          <TableCell>{site.name}</TableCell>
                          <TableCell>{site.city}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </SectionCard>

            <SectionCard title={copy.studios.staffHeading} subtitle={copy.studios.staffSubtitle}>
              {staff.length === 0 ? (
                <EmptyState message={copy.studios.staffEmpty} />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{copy.studios.colStaffName}</TableCell>
                        <TableCell>{copy.studios.colRole}</TableCell>
                        <TableCell>{copy.studios.colSite}</TableCell>
                        <TableCell align="right">{copy.studios.colAction}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {staff.map((s) => (
                        <TableRow key={s.id} hover>
                          <TableCell>{s.name}</TableCell>
                          <TableCell>
                            <Chip size="small" variant="outlined" label={ROLE_LABEL[s.role as 'coach' | 'studio_manager']} />
                          </TableCell>
                          <TableCell>{s.siteId ? siteNames.get(s.siteId) ?? s.siteId : '—'}</TableCell>
                          <TableCell align="right">
                            <ReassignAction staffMember={s} sites={sites} pending={pending} run={run} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <SectionCard title={copy.studios.createHeading}>
              <Stack component="form" spacing={2} onSubmit={onCreateSite}>
                <TextField required size="small" label={copy.studios.name} value={siteName} onChange={(e) => setSiteName(e.target.value)} />
                <TextField required size="small" label={copy.studios.city} value={city} onChange={(e) => setCity(e.target.value)} />
                <Button type="submit" variant="contained" disabled={pending}>
                  {copy.studios.createSubmit}
                </Button>
              </Stack>
            </SectionCard>

            <SectionCard title={copy.studios.createStaffHeading} subtitle={copy.studios.createStaffSubtitle}>
              <Stack component="form" spacing={2} onSubmit={onCreateStaff}>
                <TextField required size="small" label={copy.studios.fullName} value={staffName} onChange={(e) => setStaffName(e.target.value)} />
                <TextField
                  required
                  size="small"
                  type="email"
                  label={copy.studios.email}
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                  required
                  size="small"
                  type="password"
                  label={copy.studios.password}
                  autoComplete="new-password"
                  helperText={copy.studios.passwordHelper}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <TextField select required size="small" label={copy.studios.role} value={role} onChange={(e) => setRole(e.target.value as 'coach' | 'studio_manager')}>
                  <MenuItem value="coach">{ROLE_LABEL.coach}</MenuItem>
                  <MenuItem value="studio_manager">{ROLE_LABEL.studio_manager}</MenuItem>
                </TextField>
                <TextField select required size="small" label={copy.studios.site} value={staffSiteId} onChange={(e) => setStaffSiteId(e.target.value)}>
                  {sites.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Button type="submit" variant="outlined" disabled={pending}>
                  {copy.studios.createStaffSubmit}
                </Button>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
      <Snackbar open={notice !== null} autoHideDuration={4000} onClose={() => setNotice(null)} message={notice ?? ''} />
    </Stack>
  );
}
