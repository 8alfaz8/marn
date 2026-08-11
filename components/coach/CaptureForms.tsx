'use client';

import { useId, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { MUSCLES, PARQ_QUESTIONS, serviceById } from '@/lib/reference';
import { createManualAssessment } from '@/lib/actions/assessments';
import { logSession } from '@/lib/actions/sessions';
import { submitParqScreening } from '@/lib/actions/parq';
import { copy } from './copy';
import type { ScheduleBooking } from './types';

/* Both forms are module-scope components with their own state, rendered
   inline (never in a blocking Dialog) — CLAUDE.md: "a measurement goes in
   with minimum taps and never blocks on a modal", and the known trap about
   inline sub-components remounting and dropping a coach's half-typed notes.
   The parent keeps them mounted across a context refresh; they only unmount
   when the coach deliberately switches member or closes the panel. */

const PAIN_MARKS = [0, 2, 4, 6, 8, 10].map((v) => ({ value: v, label: String(v) }));

/** Loosely matched to lib/reference.ts's SERVICES plus the two recovery
 *  modalities the studio runs that aren't separately bookable yet. */
const MODALITIES = ['Assisted Stretch', 'Compression Recovery', 'Oxygen Reset', 'Sound', 'Hydration'];

export function MeasurementCapture({ memberId, onSaved }: { memberId: string; onSaved: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const entered = MUSCLES.map((m) => ({ key: m.key, value: Number(values[m.key]) })).filter(
    (r) => values[r.key] !== undefined && values[r.key] !== '' && Number.isFinite(r.value),
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (entered.length === 0) {
      setError(copy.capture.none);
      return;
    }
    setStatus('saving');
    try {
      await createManualAssessment(memberId, entered);
      setValues({});
      setSaved(true);
      onSaved();
    } catch {
      setError(copy.capture.failed);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <Stack component="form" onSubmit={onSubmit} spacing={2}>
      <Box>
        <Typography variant="h6">{copy.capture.heading}</Typography>
        <Typography variant="body2" color="text.secondary">{copy.capture.hint}</Typography>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {saved && <Alert severity="success">{copy.capture.saved}</Alert>}
      <Grid container spacing={2}>
        {MUSCLES.map((m) => (
          <Grid key={m.key} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
            <TextField
              size="small"
              fullWidth
              type="number"
              label={m.label}
              helperText={copy.capture.targetHelper(m.target)}
              value={values[m.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [m.key]: e.target.value }))}
              slotProps={{ htmlInput: { min: 0, max: 360, inputMode: 'numeric' } }}
            />
          </Grid>
        ))}
      </Grid>
      <Box>
        <Button type="submit" variant="contained" disabled={status === 'saving'}>
          {status === 'saving' ? copy.capture.saving : copy.capture.save}
        </Button>
      </Box>
    </Stack>
  );
}

export function ParqScreeningForm({ memberId, onSaved }: { memberId: string; onSaved: () => void }) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<'cleared' | 'redFlag' | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setStatus('saving');
    try {
      const { redFlag } = await submitParqScreening(memberId, answers, note.trim() || undefined);
      setResult(redFlag ? 'redFlag' : 'cleared');
      if (!redFlag) {
        setAnswers({});
        setNote('');
      }
      onSaved();
    } catch {
      setError(copy.parq.failed);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <Stack component="form" onSubmit={onSubmit} spacing={2}>
      <Box>
        <Typography variant="h6">{copy.parq.heading}</Typography>
        <Typography variant="body2" color="text.secondary">{copy.parq.hint}</Typography>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {result === 'cleared' && <Alert severity="success">{copy.parq.cleared}</Alert>}
      {result === 'redFlag' && <Alert severity="warning">{copy.parq.redFlag}</Alert>}
      <Stack spacing={0.5}>
        {PARQ_QUESTIONS.map((q) => (
          <FormControlLabel
            key={q.key}
            control={
              <Checkbox
                checked={answers[q.key] ?? false}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.checked }))}
              />
            }
            label={q.text}
          />
        ))}
      </Stack>
      <TextField
        size="small"
        fullWidth
        multiline
        minRows={2}
        label={copy.parq.noteLabel}
        helperText={copy.parq.noteHelper}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Box>
        <Button type="submit" variant="contained" disabled={status === 'saving'}>
          {status === 'saving' ? copy.parq.saving : copy.parq.save}
        </Button>
      </Box>
    </Stack>
  );
}

export function SessionLogForm({
  memberId,
  bookings,
  nextUpLabel,
  onSaved,
}: {
  memberId: string;
  bookings: ScheduleBooking[];
  nextUpLabel: string | null;
  onSaved: () => void;
}) {
  const openBooking = bookings.find((b) => b.status === 'confirmed');
  const labelId = useId();

  const [bookingId, setBookingId] = useState(openBooking?.id ?? '');
  const [modalities, setModalities] = useState<string[]>([]);
  const [mins, setMins] = useState(String(serviceById(openBooking?.serviceId ?? '')?.mins ?? 30));
  const [rpe, setRpe] = useState(5);
  const [painBefore, setPainBefore] = useState(5);
  const [painAfter, setPainAfter] = useState(3);
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(null);
    // The server rejects an empty summary; catching it here saves a round
    // trip and keeps the coach's typing intact.
    if (!summary.trim()) {
      setError(copy.log.summaryRequired);
      return;
    }
    setStatus('saving');
    try {
      await logSession({
        memberId,
        bookingId: bookingId || undefined,
        completedAt: new Date().toISOString(),
        mins: Number(mins) || 0,
        modalities,
        rpe,
        painBefore,
        painAfter,
        coachNotes: notes.trim() || undefined,
        memberSummary: summary,
      });
      setSummary('');
      setNotes('');
      setModalities([]);
      setBookingId('');
      setSaved(nextUpLabel ? copy.log.savedNext(nextUpLabel) : copy.log.savedNothingNext);
      onSaved();
    } catch {
      setError(copy.log.failed);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <Stack component="form" onSubmit={onSubmit} spacing={2}>
      <Typography variant="h6">{copy.log.heading}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {saved && (
        <Alert severity="success">
          {copy.log.saved} {saved}
        </Alert>
      )}

      {bookings.length > 0 && (
        <TextField
          select
          size="small"
          label={copy.log.booking}
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          sx={{ maxWidth: 320 }}
        >
          <MenuItem value="">{copy.log.noBooking}</MenuItem>
          {bookings.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.time} · {serviceById(b.serviceId)?.name ?? copy.booking.unknownService}
            </MenuItem>
          ))}
        </TextField>
      )}

      <Box>
        <Typography variant="overline" color="text.secondary" component="div">
          {copy.log.modalities}
        </Typography>
        <ToggleButtonGroup
          value={modalities}
          onChange={(_, next: string[]) => setModalities(next)}
          size="small"
          sx={{ flexWrap: 'wrap', gap: 1, '& .MuiToggleButtonGroup-grouped': { border: '1px solid', borderColor: 'divider' } }}
        >
          {MODALITIES.map((m) => (
            <ToggleButton key={m} value={m} sx={{ paddingInline: 2 }}>
              {m}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField
            size="small"
            fullWidth
            type="number"
            label={copy.log.mins}
            value={mins}
            onChange={(e) => setMins(e.target.value)}
            slotProps={{ htmlInput: { min: 0, max: 240, inputMode: 'numeric' } }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Typography variant="body2" color="text.secondary" id={`${labelId}-rpe`}>
            {copy.log.rpe}
          </Typography>
          <Slider
            value={rpe}
            onChange={(_, v) => setRpe(v as number)}
            min={0}
            max={10}
            step={1}
            marks={PAIN_MARKS}
            valueLabelDisplay="auto"
            aria-labelledby={`${labelId}-rpe`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Typography variant="body2" color="text.secondary" id={`${labelId}-before`}>
            {copy.log.painBefore}
          </Typography>
          <Slider
            value={painBefore}
            onChange={(_, v) => setPainBefore(v as number)}
            min={0}
            max={10}
            step={1}
            marks={PAIN_MARKS}
            valueLabelDisplay="auto"
            aria-labelledby={`${labelId}-before`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Typography variant="body2" color="text.secondary" id={`${labelId}-after`}>
            {copy.log.painAfter}
          </Typography>
          <Slider
            value={painAfter}
            onChange={(_, v) => setPainAfter(v as number)}
            min={0}
            max={10}
            step={1}
            marks={PAIN_MARKS}
            valueLabelDisplay="auto"
            aria-labelledby={`${labelId}-after`}
          />
        </Grid>
      </Grid>

      <TextField
        size="small"
        fullWidth
        multiline
        minRows={2}
        label={copy.log.notes}
        helperText={copy.log.notesHelper}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <TextField
        size="small"
        fullWidth
        required
        multiline
        minRows={3}
        label={copy.log.summary}
        helperText={copy.log.summaryHelper}
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />
      <Box>
        <Button type="submit" variant="contained" disabled={status === 'saving' || !summary.trim()}>
          {status === 'saving' ? copy.log.saving : copy.log.save}
        </Button>
      </Box>
    </Stack>
  );
}
