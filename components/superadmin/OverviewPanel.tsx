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
import { recordCashEntry } from '@/lib/actions/cashLedger';
import CoachSessionHistoryDialog from '@/components/shared/CoachSessionHistoryDialog';
import { copy } from './copy';
import type { CashLedger, CoachWorkload, SuperadminDashboard } from './types';
// Generic, console-agnostic presentational primitives — reused rather than
// re-implemented (StatTile/SectionCard/EmptyState carry no studio-specific
// logic, just MUI + the design-system tokens).
import { EmptyState, SectionCard, StatTile, formatDay, formatNumber, useFormSubmit } from '@/components/studio/primitives';

export default function OverviewPanel({
  dashboard,
  workload,
  ledger,
}: {
  dashboard: SuperadminDashboard;
  workload: CoachWorkload;
  ledger: CashLedger;
}) {
  const { pending, error, notice, setError, setNotice, run } = useFormSubmit();
  const [siteId, setSiteId] = useState('');
  const [type, setType] = useState<'manual_in' | 'manual_out'>('manual_in');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedCoach, setSelectedCoach] = useState<{ id: string; name: string } | null>(null);

  const onRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const amountAed = Number(amount);
    if (!siteId || !amountAed) return;
    run(copy.ledger.recorded, () => recordCashEntry({ siteId, type, amountAed, note: note || undefined }), () => {
      setAmount('');
      setNote('');
    });
  };

  return (
    <Stack spacing={3}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={1}>
        <Typography variant="h6">{copy.dashboard.platformHeading}</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatTile label={copy.dashboard.sessionsToday} value={formatNumber(dashboard.totals.sessionsToday)} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatTile label={copy.dashboard.sessionsThisWeek} value={formatNumber(dashboard.totals.sessionsThisWeek)} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatTile
              label={copy.dashboard.revenue7d}
              value={formatNumber(dashboard.totals.revenue7d)}
              unit={copy.dashboard.revenueUnit}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <StatTile label={copy.dashboard.activeCoaches} value={formatNumber(dashboard.totals.activeCoachCount)} />
          </Grid>
        </Grid>
      </Stack>

      <SectionCard title={copy.dashboard.bySiteHeading} subtitle={copy.dashboard.bySiteSubtitle}>
        {dashboard.perSite.length === 0 ? (
          <EmptyState message={copy.dashboard.empty} />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{copy.dashboard.colSite}</TableCell>
                  <TableCell align="right">{copy.dashboard.colSessionsToday}</TableCell>
                  <TableCell align="right">{copy.dashboard.colSessionsWeek}</TableCell>
                  <TableCell align="right">{copy.dashboard.colRevenue}</TableCell>
                  <TableCell align="right">{copy.dashboard.colCoaches}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboard.perSite.map((site) => (
                  <TableRow key={site.siteId} hover>
                    <TableCell>{site.siteName}</TableCell>
                    <TableCell align="right">{formatNumber(site.sessionsToday)}</TableCell>
                    <TableCell align="right">{formatNumber(site.sessionsThisWeek)}</TableCell>
                    <TableCell align="right">{formatNumber(site.revenue7d)}</TableCell>
                    <TableCell align="right">{formatNumber(site.activeCoachCount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      <SectionCard title={copy.workload.heading} subtitle={copy.workload.subtitle}>
        {workload.length === 0 ? (
          <EmptyState message={copy.workload.empty} />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{copy.workload.colName}</TableCell>
                  <TableCell align="right">{copy.workload.colShiftHours}</TableCell>
                  <TableCell align="right">{copy.workload.colBookedHours}</TableCell>
                  <TableCell align="right">{copy.workload.colUpcoming}</TableCell>
                  <TableCell align="right">{copy.workload.colCompleted}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workload.map((coach) => (
                  <TableRow
                    key={coach.coachId}
                    hover
                    onClick={() => setSelectedCoach({ id: coach.coachId, name: coach.name })}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{coach.name}</TableCell>
                    <TableCell align="right">{coach.shiftHoursNext7d}</TableCell>
                    <TableCell align="right">{coach.bookedHoursNext7d}</TableCell>
                    <TableCell align="right">{coach.upcomingBookingCount}</TableCell>
                    <TableCell align="right">{coach.sessionsLast7d}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard title={copy.ledger.heading} subtitle={copy.ledger.subtitle}>
            {ledger.entries.length === 0 ? (
              <EmptyState message={copy.ledger.empty} />
            ) : (
              <Stack spacing={1.5}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {copy.ledger.total}: {formatNumber(ledger.total)} {copy.dashboard.revenueUnit}
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{copy.ledger.colDate}</TableCell>
                        <TableCell>{copy.ledger.colSite}</TableCell>
                        <TableCell>{copy.ledger.colType}</TableCell>
                        <TableCell>{copy.ledger.colNote}</TableCell>
                        <TableCell align="right">{copy.ledger.colAed}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ledger.entries.map((entry, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{formatDay(entry.at)}</TableCell>
                          <TableCell>{entry.siteName}</TableCell>
                          <TableCell>{copy.ledger.type[entry.kind]}</TableCell>
                          <TableCell>{entry.note ?? '—'}</TableCell>
                          <TableCell align="right">
                            {entry.kind === 'manual_out' ? '-' : ''}
                            {formatNumber(entry.amountAed)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title={copy.ledger.entryHeading}>
            <Stack component="form" spacing={2} onSubmit={onRecord}>
              <TextField select required size="small" label={copy.ledger.site} value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                {dashboard.perSite.map((site) => (
                  <MenuItem key={site.siteId} value={site.siteId}>
                    {site.siteName}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                required
                size="small"
                label={copy.ledger.entryType}
                value={type}
                onChange={(e) => setType(e.target.value as 'manual_in' | 'manual_out')}
              >
                <MenuItem value="manual_in">{copy.ledger.type.manual_in}</MenuItem>
                <MenuItem value="manual_out">{copy.ledger.type.manual_out}</MenuItem>
              </TextField>
              <TextField
                required
                size="small"
                type="number"
                label={copy.ledger.amount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <TextField size="small" label={copy.ledger.note} value={note} onChange={(e) => setNote(e.target.value)} />
              <Button type="submit" variant="contained" disabled={pending}>
                {copy.ledger.submit}
              </Button>
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      <Snackbar open={notice !== null} autoHideDuration={4000} onClose={() => setNotice(null)} message={notice ?? ''} />
      <CoachSessionHistoryDialog
        coachId={selectedCoach?.id ?? null}
        coachName={selectedCoach?.name ?? ''}
        onClose={() => setSelectedCoach(null)}
      />
    </Stack>
  );
}
