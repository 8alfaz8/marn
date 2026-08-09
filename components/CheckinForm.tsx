'use client';
import { useState } from 'react';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import { api } from '@/lib/store';
import { MUSCLES } from '@/lib/reference';

/* Pre-session check-in. Module scope for the same reason as ParqForm — a
 * sub-view defined inside Member's body would remount on every snapshot poll
 * and wipe whatever the member had half-filled in. See CLAUDE.md's "Known
 * trap". Previously this button sent the same hardcoded {sleep:3, pain:5,
 * areas:['lower back','right shoulder']} on every click; this is the real
 * form behind it.
 */

type Props = {
  open: boolean;
  memberId: string;
  onClose: () => void;
  onSent: () => void;
};

const SLEEP_LABELS: Record<number, string> = { 1: 'Rough', 2: 'Poor', 3: 'OK', 4: 'Good', 5: 'Great' };

export default function CheckinForm({ open, memberId, onClose, onSent }: Props) {
  const [sleep, setSleep] = useState(3);
  const [pain, setPain] = useState(0);
  const [areas, setAreas] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const toggleArea = (label: string) =>
    setAreas((a) => (a.includes(label) ? a.filter((x) => x !== label) : [...a, label]));

  const reset = () => { setSleep(3); setPain(0); setAreas([]); setNote(''); };

  const submit = async () => {
    setBusy(true);
    try {
      await api('POST', '/checkins', { memberId, sleep, pain, areas, note: note.trim() || undefined }, 'MEMBER');
      reset();
      onSent();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block' }}>
          Before your session
        </Typography>
        Pre-session check-in
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Thirty seconds. Your coach sees this before you walk in.
          </Typography>

          <Stack spacing={1}>
            <Typography variant="overline" color="text.secondary">
              Sleep last night — {SLEEP_LABELS[sleep]}
            </Typography>
            <Slider
              value={sleep} min={1} max={5} step={1} marks
              valueLabelDisplay="off"
              aria-label="Sleep quality"
              onChange={(_, v) => setSleep(v as number)}
            />
          </Stack>

          <Stack spacing={1}>
            <Typography variant="overline" color="text.secondary">
              Pain right now — {pain}/10
            </Typography>
            <Slider
              value={pain} min={0} max={10} step={1} marks
              valueLabelDisplay="auto"
              aria-label="Pain level"
              onChange={(_, v) => setPain(v as number)}
            />
          </Stack>

          <Stack spacing={1}>
            <Typography variant="overline" color="text.secondary">
              Anywhere tight or sore? (optional, pick any)
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {MUSCLES.map((mu) => (
                <Chip
                  key={mu.key}
                  label={mu.label}
                  clickable
                  color={areas.includes(mu.label) ? 'secondary' : 'default'}
                  variant={areas.includes(mu.label) ? 'filled' : 'outlined'}
                  onClick={() => toggleArea(mu.label)}
                />
              ))}
            </Stack>
          </Stack>

          <TextField
            label="Anything else your coach should know (optional)"
            multiline
            minRows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="text" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy}>
          {busy ? 'Sending…' : 'Send check-in'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
