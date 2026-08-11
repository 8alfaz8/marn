'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { MUSCLES } from '@/lib/reference';
import { clearFlag, raiseFlag } from '@/lib/actions/flags';
import { copy } from './copy';
import { MeasurementCapture, ParqScreeningForm, PrescribeProgramForm, SessionLogForm } from './CaptureForms';
import type { MemberContext, ScheduleBooking } from './types';

/* Everything a coach needs before and during the session, on one surface.
   Density reference: an operating day-list console (Linear's issue detail
   next to its list), not a dashboard — one selection, one deep panel, and
   capture happens in place rather than on another screen. */

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Presentation band only — a way to read a bar at arm's length, never
 *  stored and never mistaken for a measured value. */
const bandFor = (pct: number) => {
  if (pct < 50) return 'band.restricted';
  if (pct < 75) return 'band.limited';
  if (pct < 100) return 'band.optimal';
  return 'band.excellent';
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="overline" color="text.secondary" component="div">
      {children}
    </Typography>
  );
}

function FlagsSection({
  flags,
  memberId,
  staffName,
  onChanged,
}: {
  flags: MemberContext['flags'];
  memberId: string;
  staffName: string;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClear = async (flagId: string) => {
    setError(null);
    setBusy(true);
    try {
      await clearFlag(flagId);
      setConfirming(null);
      onChanged();
    } catch {
      setError(copy.flags.clearFailed);
    } finally {
      setBusy(false);
    }
  };

  const onRaise = async () => {
    setError(null);
    if (!text.trim()) {
      setError(copy.flags.raiseEmpty);
      return;
    }
    setBusy(true);
    try {
      await raiseFlag(memberId, text.trim());
      setText('');
      onChanged();
    } catch {
      setError(copy.flags.raiseFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <SectionHeading>{copy.flags.heading}</SectionHeading>
      {error && <Alert severity="error">{error}</Alert>}
      {flags.length === 0 && (
        <Typography variant="body2" color="text.secondary">{copy.flags.none}</Typography>
      )}
      {flags.map((flag) => (
        <Alert
          key={flag.id}
          severity="warning"
          action={
            confirming === flag.id ? undefined : (
              <Button size="small" onClick={() => setConfirming(flag.id)}>{copy.flags.clear}</Button>
            )
          }
        >
          <Typography variant="body2">{flag.text}</Typography>
          <Typography variant="body2" color="text.secondary">
            {copy.flags.raisedOn(formatDate(flag.raisedAt))}
          </Typography>
          <Collapse in={confirming === flag.id}>
            <Stack spacing={1} sx={{ marginBlockStart: 1 }}>
              <Typography variant="body2">{copy.flags.clearConfirm(staffName)}</Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" variant="contained" disabled={busy} onClick={() => onClear(flag.id)}>
                  {copy.flags.clearYes}
                </Button>
                <Button size="small" onClick={() => setConfirming(null)}>{copy.flags.clearNo}</Button>
              </Stack>
            </Stack>
          </Collapse>
        </Alert>
      ))}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'flex-start' }}>
        <TextField
          size="small"
          fullWidth
          label={copy.flags.raiseLabel}
          placeholder={copy.flags.raisePlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button variant="outlined" disabled={busy} onClick={onRaise} sx={{ flexShrink: 0 }}>
          {copy.flags.raiseAction}
        </Button>
      </Stack>
    </Stack>
  );
}

function MeasurementsSection({
  assessments,
  measurements,
}: {
  assessments: MemberContext['assessments'];
  measurements: MemberContext['measurements'];
}) {
  const latest = assessments[0];
  const previous = assessments[1];
  const current = measurements.filter((m) => m.assessmentId === latest?.id);
  const before = new Map(
    measurements.filter((m) => m.assessmentId === previous?.id).map((m) => [m.muscleKey, m.degrees]),
  );

  if (!latest || current.length === 0) {
    return (
      <Stack spacing={1}>
        <SectionHeading>{copy.measurements.heading}</SectionHeading>
        <Typography variant="body2" color="text.secondary">{copy.measurements.empty}</Typography>
      </Stack>
    );
  }

  const ordered = MUSCLES.map((muscle) => current.find((m) => m.muscleKey === muscle.key)).filter(
    (m): m is (typeof current)[number] => Boolean(m),
  );

  return (
    <Stack spacing={1.5}>
      <SectionHeading>{copy.measurements.heading}</SectionHeading>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {copy.measurements.capturedOn(formatDate(latest.capturedAt))}
        </Typography>
        {/* Provenance is visible, per the Iron Rule: a coach can always see
            where a number came from without opening anything. */}
        <Chip size="small" variant="outlined" label={copy.measurements.source[ordered[0].source] ?? ordered[0].source} />
      </Stack>
      <Grid container spacing={2}>
        {ordered.map((m) => {
          const pct = Math.round((m.degrees / m.target) * 100);
          const prior = before.get(m.muscleKey);
          const delta = prior === undefined ? null : m.degrees - prior;
          return (
            <Grid key={m.muscleKey} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Stack spacing={0.5}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="body2">
                    {MUSCLES.find((x) => x.key === m.muscleKey)?.label ?? m.muscleKey}
                  </Typography>
                  <Typography variant="body2">
                    {m.degrees}
                    {copy.measurements.degrees}
                    <Typography component="span" variant="body2" color="text.secondary">
                      {' / '}
                      {m.target}
                      {copy.measurements.degrees}
                    </Typography>
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, pct)}
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    bgcolor: 'surfaceRaised',
                    '& .MuiLinearProgress-bar': { bgcolor: bandFor(pct) },
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  {copy.measurements.ofTarget(pct)}
                  {delta !== null && delta !== 0 ? ` · ${copy.measurements.change(delta)}` : ''}
                </Typography>
              </Stack>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}

function CheckinsSection({ checkins }: { checkins: MemberContext['checkins'] }) {
  return (
    <Stack spacing={1.5}>
      <SectionHeading>{copy.checkins.heading}</SectionHeading>
      {checkins.length === 0 && (
        <Typography variant="body2" color="text.secondary">{copy.checkins.empty}</Typography>
      )}
      {checkins.map((c) => (
        <Box key={c.id}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">{formatDate(c.at)}</Typography>
            <Typography variant="body2">
              {copy.checkins.sleep} {c.sleep}
              {copy.checkins.outOf}
            </Typography>
            <Typography variant="body2">
              {copy.checkins.pain} {c.pain}
              {copy.checkins.outOf}
            </Typography>
            {(c.areas ?? []).map((area) => (
              <Chip key={area} size="small" variant="outlined" label={area} />
            ))}
          </Stack>
          {c.note && <Typography variant="body2">{c.note}</Typography>}
        </Box>
      ))}
    </Stack>
  );
}

function ProgramSection({ program }: { program: MemberContext['program'] }) {
  const recentCount = program
    ? program.completions.filter((iso) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 28);
        return new Date(iso) >= cutoff;
      }).length
    : 0;
  return (
    <Stack spacing={1}>
      <SectionHeading>{copy.program.currentHeading}</SectionHeading>
      {!program ? (
        <Typography variant="body2" color="text.secondary">{copy.program.currentEmpty}</Typography>
      ) : (
        <>
          <Typography variant="body2">{program.title}</Typography>
          <Typography variant="body2" color="text.secondary">{copy.program.completions(recentCount)}</Typography>
        </>
      )}
    </Stack>
  );
}

function SessionsSection({ sessions }: { sessions: MemberContext['sessions'] }) {
  return (
    <Stack spacing={1.5}>
      <SectionHeading>{copy.sessions.heading}</SectionHeading>
      {sessions.length === 0 && (
        <Typography variant="body2" color="text.secondary">{copy.sessions.empty}</Typography>
      )}
      {sessions.map((s) => (
        <Box key={s.id}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">{formatDate(s.completedAt)}</Typography>
            <Typography variant="body2">{copy.sessions.mins(s.mins)}</Typography>
            <Typography variant="body2">{copy.sessions.painChange(s.painBefore, s.painAfter)}</Typography>
            {(s.modalities ?? []).map((m) => (
              <Chip key={m} size="small" variant="outlined" label={m} />
            ))}
          </Stack>
          <Typography variant="body2">
            <Typography component="span" variant="body2" color="text.secondary">
              {copy.sessions.memberSummaryLabel}:{' '}
            </Typography>
            {s.memberSummary}
          </Typography>
          {s.coachNotes && (
            <Typography variant="body2" color="text.secondary">
              {copy.sessions.coachNotesLabel}: {s.coachNotes}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

export default function MemberContextPanel({
  context,
  staffName,
  todayBookings,
  nextUpLabel,
  loading,
  onChanged,
}: {
  context: MemberContext;
  staffName: string;
  todayBookings: ScheduleBooking[];
  nextUpLabel: string | null;
  loading: boolean;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState<'measure' | 'log' | 'parq' | 'program' | null>(null);
  const toggle = (which: 'measure' | 'log' | 'parq' | 'program') => setOpen((cur) => (cur === which ? null : which));

  return (
    <Stack spacing={2}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Refresh shows as a hairline, never as a replaced panel: the
            capture forms below must survive a background revalidation with
            their contents intact. */}
        <Box sx={{ height: 4, marginBlockEnd: 1 }}>{loading && <LinearProgress />}</Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h4">{context.member.name}</Typography>
            <Chip
              size="small"
              variant="outlined"
              color={context.parqCleared ? 'default' : 'warning'}
              label={context.parqCleared ? copy.member.readinessCleared : copy.member.readinessPending}
            />
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button variant={open === 'parq' ? 'contained' : 'outlined'} onClick={() => toggle('parq')}>
              {open === 'parq' ? copy.member.close : context.parqCleared ? copy.member.rescreen : copy.member.startScreening}
            </Button>
            <Button variant={open === 'measure' ? 'contained' : 'outlined'} onClick={() => toggle('measure')}>
              {open === 'measure' ? copy.member.close : copy.member.recordMeasurements}
            </Button>
            <Button variant={open === 'log' ? 'contained' : 'outlined'} onClick={() => toggle('log')}>
              {open === 'log' ? copy.member.close : copy.member.logSession}
            </Button>
            <Button variant={open === 'program' ? 'contained' : 'outlined'} onClick={() => toggle('program')}>
              {open === 'program' ? copy.member.close : copy.member.prescribeProgram}
            </Button>
          </Stack>
        </Stack>

        {!context.parqCleared && context.latestParqScreening?.redFlag && (
          <Alert severity="warning" sx={{ marginBlockStart: 2 }}>
            {copy.parq.referral}
          </Alert>
        )}

        {/* Kept mounted (Collapse, not conditional render) so half-entered
            values are still there if the coach collapses the panel to read
            the member's history and comes back. */}
        <Collapse in={open === 'parq'} unmountOnExit={false}>
          <Divider sx={{ marginBlock: 2 }} />
          <ParqScreeningForm memberId={context.member.id} onSaved={onChanged} />
        </Collapse>
        <Collapse in={open === 'measure'} unmountOnExit={false}>
          <Divider sx={{ marginBlock: 2 }} />
          <MeasurementCapture memberId={context.member.id} onSaved={onChanged} />
        </Collapse>
        <Collapse in={open === 'log'} unmountOnExit={false}>
          <Divider sx={{ marginBlock: 2 }} />
          <SessionLogForm
            memberId={context.member.id}
            bookings={todayBookings}
            nextUpLabel={nextUpLabel}
            onSaved={onChanged}
          />
        </Collapse>
        <Collapse in={open === 'program'} unmountOnExit={false}>
          <Divider sx={{ marginBlock: 2 }} />
          <PrescribeProgramForm memberId={context.member.id} onSaved={onChanged} />
        </Collapse>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <ProgramSection program={context.program} />
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <FlagsSection
          flags={context.flags}
          memberId={context.member.id}
          staffName={staffName}
          onChanged={onChanged}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <MeasurementsSection assessments={context.assessments} measurements={context.measurements} />
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
            <CheckinsSection checkins={context.checkins} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
            <SessionsSection sessions={context.sessions} />
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
