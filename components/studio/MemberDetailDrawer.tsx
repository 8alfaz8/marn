'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { getMemberBookingHistory } from '@/lib/actions/bookings';
import { getMemberContext } from '@/lib/actions/members';
import { getActiveMemberAccessToken, generateMemberAccessLink, revokeMemberAccessLink } from '@/lib/actions/memberAccess';
import { MUSCLES, serviceById } from '@/lib/reference';
import { copy } from './copy';
import { BookingStatusChip, formatDay, formatNumber } from './primitives';
import type { Member, MemberBookingHistory, MemberContext } from './types';

/* Studio manager's read-only view of one member: session history,
   measurements, and booking/charge history — the "other information" a
   coach's own member view deliberately excludes (docs/adr/0008 restricts a
   coach from payment data; a studio manager is unrestricted at their site).
   A Drawer, not a route, so the roster underneath stays in place. Module
   scope, per CLAUDE.md's known trap. */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="overline" sx={{ color: 'text.secondary' }} component="div">
      {children}
    </Typography>
  );
}

function MeasurementsSection({ context }: { context: MemberContext }) {
  const latest = context.assessments[0];
  const current = context.measurements.filter((m) => m.assessmentId === latest?.id);
  if (!latest || current.length === 0) {
    return (
      <Stack spacing={1}>
        <SectionHeading>{copy.memberDetail.measurementsHeading}</SectionHeading>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {copy.memberDetail.measurementsEmpty}
        </Typography>
      </Stack>
    );
  }
  const ordered = MUSCLES.map((muscle) => current.find((m) => m.muscleKey === muscle.key)).filter(
    (m): m is (typeof current)[number] => Boolean(m),
  );
  return (
    <Stack spacing={1.5}>
      <SectionHeading>{copy.memberDetail.measurementsHeading}</SectionHeading>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {copy.memberDetail.capturedOn(formatDay(latest.capturedAt))}
        </Typography>
        <Chip size="small" variant="outlined" label={copy.memberDetail.source[ordered[0].source] ?? ordered[0].source} />
      </Stack>
      <Stack spacing={1.25}>
        {ordered.map((m) => {
          const pct = Math.round((m.degrees / m.target) * 100);
          return (
            <Box key={m.muscleKey}>
              <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                <Typography variant="body2">{MUSCLES.find((x) => x.key === m.muscleKey)?.label ?? m.muscleKey}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {m.degrees}
                  {copy.memberDetail.degrees} / {m.target}
                  {copy.memberDetail.degrees}
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={Math.min(100, pct)} sx={{ height: 6, borderRadius: 1 }} />
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}

function SessionsSection({ context }: { context: MemberContext }) {
  return (
    <Stack spacing={1.5}>
      <SectionHeading>{copy.memberDetail.sessionsHeading}</SectionHeading>
      {context.sessions.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {copy.memberDetail.sessionsEmpty}
        </Typography>
      ) : (
        context.sessions.map((s) => (
          <Box key={s.id}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {formatDay(s.completedAt)}
              </Typography>
              <Typography variant="body2">{copy.memberDetail.sessionMins(s.mins)}</Typography>
              <Typography variant="body2">{copy.memberDetail.painChange(s.painBefore, s.painAfter)}</Typography>
            </Stack>
            {s.memberSummary && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {s.memberSummary}
              </Typography>
            )}
          </Box>
        ))
      )}
    </Stack>
  );
}

/** Module scope, per CLAUDE.md's known trap — an inline sub-component here
 *  would remount (and lose the copied/error state) on every drawer refresh. */
function MemberAccessSection({ memberId }: { memberId: string }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setToken(undefined);
    getActiveMemberAccessToken(memberId).then((t) => {
      if (!cancelled) setToken(t);
    });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  const linkFor = (t: string) => `${window.location.origin}/m/${t}`;

  const onGenerate = async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const t = await generateMemberAccessLink(memberId);
      setToken(t);
      await navigator.clipboard.writeText(linkFor(t));
      setMessage(`${copy.memberAccess.generated} ${copy.memberAccess.copied}`);
    } catch {
      setError(copy.memberAccess.failed);
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(linkFor(token));
    setMessage(copy.memberAccess.copied);
  };

  const onRevoke = async () => {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      await revokeMemberAccessLink(memberId);
      setToken(null);
      setMessage(copy.memberAccess.revoked);
    } catch {
      setError(copy.memberAccess.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <SectionHeading>{copy.memberAccess.heading}</SectionHeading>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{copy.memberAccess.subtitle}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}
      {token === undefined ? (
        <CircularProgress size={20} />
      ) : (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {token ? (
            <>
              <Button size="small" variant="outlined" disabled={busy} onClick={onCopy}>
                {copy.memberAccess.copy}
              </Button>
              <Button size="small" variant="outlined" disabled={busy} onClick={onGenerate}>
                {copy.memberAccess.regenerate}
              </Button>
              <Button size="small" color="error" disabled={busy} onClick={onRevoke}>
                {copy.memberAccess.revoke}
              </Button>
            </>
          ) : (
            <Button size="small" variant="outlined" disabled={busy} onClick={onGenerate}>
              {copy.memberAccess.generate}
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  );
}

function BookingsSection({ bookings }: { bookings: MemberBookingHistory }) {
  return (
    <Stack spacing={1.5}>
      <SectionHeading>{copy.memberDetail.bookingsHeading}</SectionHeading>
      {bookings.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {copy.memberDetail.bookingsEmpty}
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{copy.memberDetail.colDate}</TableCell>
              <TableCell>{copy.memberDetail.colTime}</TableCell>
              <TableCell>{copy.memberDetail.colService}</TableCell>
              <TableCell align="right">{copy.memberDetail.colAed}</TableCell>
              <TableCell>{copy.memberDetail.colStatus}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{formatDay(b.date)}</TableCell>
                <TableCell>{b.time}</TableCell>
                <TableCell>{serviceById(b.serviceId)?.name ?? b.serviceId}</TableCell>
                <TableCell align="right">{formatNumber(b.aed)}</TableCell>
                <TableCell>
                  <BookingStatusChip status={b.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Stack>
  );
}

export default function MemberDetailDrawer({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const [context, setContext] = useState<MemberContext | null>(null);
  const [bookings, setBookings] = useState<MemberBookingHistory | null>(null);

  useEffect(() => {
    if (!member) {
      setContext(null);
      setBookings(null);
      return;
    }
    let cancelled = false;
    Promise.all([getMemberContext(member.id), getMemberBookingHistory(member.id)]).then(([ctx, hist]) => {
      if (!cancelled) {
        setContext(ctx);
        setBookings(hist);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [member]);

  const loading = member !== null && (context === null || bookings === null);

  return (
    <Drawer anchor="right" open={member !== null} onClose={onClose}>
      <Box sx={{ inlineSize: { xs: '100vw', sm: 420 }, p: { xs: 2, sm: 3 } }}>
        {member && (
          <Stack spacing={2}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h5">{member.name}</Typography>
              <Button size="small" onClick={onClose}>
                {copy.memberDetail.close}
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {member.phone}
              </Typography>
              {member.email && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {member.email}
                </Typography>
              )}
            </Stack>
            {context && (
              <Chip
                size="small"
                variant="outlined"
                color={context.parqCleared ? 'default' : 'warning'}
                label={context.parqCleared ? copy.memberDetail.readinessCleared : copy.memberDetail.readinessPending}
                sx={{ alignSelf: 'flex-start' }}
              />
            )}

            {loading ? (
              <Stack sx={{ alignItems: 'center', py: 4 }}>
                <CircularProgress size={28} />
              </Stack>
            ) : (
              context &&
              bookings && (
                <Stack spacing={3}>
                  <Divider />
                  <MemberAccessSection memberId={member.id} />
                  <Divider />
                  <MeasurementsSection context={context} />
                  <Divider />
                  <SessionsSection context={context} />
                  <Divider />
                  <BookingsSection bookings={bookings} />
                </Stack>
              )
            )}
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
