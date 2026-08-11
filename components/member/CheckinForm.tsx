'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { submitCheckin } from '@/lib/actions/checkins';
import { copy } from './copy';

/* "Two taps" per blueprint §4.1.7 — a region chip list (Lower/Core/Upper),
   not an interactive body diagram, matching the same region-grouped-list-
   not-anatomical-figure scope call already made for the body map (Phase 1).
   Module-scope per CLAUDE.md's known trap. */
const REGIONS = ['Lower', 'Core', 'Upper'];
const MARKS = [0, 2, 4, 6, 8, 10].map((v) => ({ value: v, label: String(v) }));

export default function CheckinForm() {
  const [sleep, setSleep] = useState(6);
  const [pain, setPain] = useState(2);
  const [areas, setAreas] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const toggleArea = (region: string) => {
    setAreas((cur) => (cur.includes(region) ? cur.filter((a) => a !== region) : [...cur, region]));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setStatus('saving');
    try {
      await submitCheckin({ sleep, pain, areas, note: note.trim() || undefined });
      setSaved(true);
    } catch {
      setError(copy.checkin.failed);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <Stack component="form" onSubmit={onSubmit} spacing={2} sx={{ maxWidth: 420 }}>
      <Box>
        <Typography variant="h6">{copy.checkin.heading}</Typography>
        <Typography variant="body2" color="text.secondary">{copy.checkin.body}</Typography>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {saved && <Alert severity="success">{copy.checkin.sent}</Alert>}

      <Box>
        <Typography variant="body2" sx={{ mb: 1 }}>{copy.checkin.sleep}</Typography>
        <Slider value={sleep} onChange={(_, v) => setSleep(v as number)} min={0} max={10} step={1} marks={MARKS} valueLabelDisplay="auto" />
      </Box>
      <Box>
        <Typography variant="body2" sx={{ mb: 1 }}>{copy.checkin.pain}</Typography>
        <Slider value={pain} onChange={(_, v) => setPain(v as number)} min={0} max={10} step={1} marks={MARKS} valueLabelDisplay="auto" />
      </Box>
      <Box>
        <Typography variant="body2" sx={{ mb: 1 }}>{copy.checkin.areas}</Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {REGIONS.map((r) => (
            <Chip
              key={r}
              label={r}
              clickable
              color={areas.includes(r) ? 'primary' : 'default'}
              variant={areas.includes(r) ? 'filled' : 'outlined'}
              onClick={() => toggleArea(r)}
            />
          ))}
        </Stack>
      </Box>
      <TextField
        size="small"
        fullWidth
        multiline
        minRows={2}
        label={copy.checkin.note}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Box>
        <Button type="submit" variant="contained" disabled={status === 'saving'}>
          {status === 'saving' ? copy.checkin.submitting : copy.checkin.submit}
        </Button>
      </Box>
    </Stack>
  );
}
