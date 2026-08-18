'use client';

import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { getCoachSessionHistory } from '@/lib/actions/coachWorkload';

/* No @mui/icons-material dependency at root (only @mui/material is
   installed) — a text Button, same close affordance components/studio/
   MemberDetailDrawer.tsx already uses, rather than adding a new package
   for one icon (CLAUDE.md: a new dependency is a "major change" that
   needs sign-off first, not a drive-by add). */

type SessionHistory = Awaited<ReturnType<typeof getCoachSessionHistory>>;

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

/* Item #4 — clicking a coach opens their session history. Shared by the
   superadmin coach-workload table and the studio manager staff list (item
   asks both consoles' coach lists behave the same way). Module scope per
   CLAUDE.md's known trap. Strings kept here rather than threaded through
   both consoles' copy.ts files — a single cross-console dialog with a
   handful of static labels, judged simpler than plumbing two sets of
   label props through (docs/decisions.md-worthy trade-off, noted for the
   reviewer). */
const copy = {
  title: (name: string) => `${name} — session history`,
  close: 'Close',
  empty: 'No sessions logged yet.',
  colDate: 'Date',
  colMember: 'Member',
  colMins: 'Mins',
  colPain: 'Pain change',
  loadFailed: 'Could not load session history.',
};

export default function CoachSessionHistoryDialog({
  coachId,
  coachName,
  onClose,
}: {
  coachId: string | null;
  coachName: string;
  onClose: () => void;
}) {
  const [sessions, setSessions] = useState<SessionHistory | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!coachId) {
      setSessions(null);
      setError(false);
      return;
    }
    let cancelled = false;
    setSessions(null);
    setError(false);
    getCoachSessionHistory(coachId)
      .then((rows) => {
        if (!cancelled) setSessions(rows);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [coachId]);

  return (
    <Dialog open={coachId !== null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        {copy.title(coachName)}
        <Button size="small" onClick={onClose}>
          {copy.close}
        </Button>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Typography variant="body2" color="error">
            {copy.loadFailed}
          </Typography>
        )}
        {!error && sessions === null && (
          <Stack sx={{ alignItems: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Stack>
        )}
        {!error && sessions !== null && sessions.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {copy.empty}
          </Typography>
        )}
        {!error && sessions !== null && sessions.length > 0 && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{copy.colDate}</TableCell>
                <TableCell>{copy.colMember}</TableCell>
                <TableCell align="right">{copy.colMins}</TableCell>
                <TableCell align="right">{copy.colPain}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{DATE_FORMAT.format(new Date(s.completedAt))}</TableCell>
                  <TableCell>{s.memberName}</TableCell>
                  <TableCell align="right">{s.mins}</TableCell>
                  <TableCell align="right">
                    {s.painBefore} → {s.painAfter}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
