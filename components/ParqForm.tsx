'use client';
import { useState } from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { api } from '@/lib/store';
import { PARQ_QUESTIONS } from '@/lib/reference';

/* Self-service readiness screening.
 *
 * Module scope on purpose: a sub-view defined inside Member's body would get a
 * new identity on every render, so the five-second snapshot poll would remount
 * this dialog and wipe half-answered questions. See CLAUDE.md's "Known trap".
 *
 * A red-flag answer does NOT clear the member — the route returns
 * { cleared:false, referral:true, message } and we hold the dialog open with a
 * persistent warning. Warning severity is reserved for safety, which is exactly
 * what this is. The parent keeps the booking action disabled either way,
 * because it reads parqCleared off the refreshed snapshot rather than from here.
 */

type Props = {
  open: boolean;
  memberId: string;
  onClose: () => void;
  /** Screening passed — parent refreshes, closes and confirms. */
  onCleared: () => void;
  /** Screening returned a referral — parent shows this persistently on the page. */
  onReferral: (message: string) => void;
};

export default function ParqForm({ open, memberId, onClose, onCleared, onReferral }: Props) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const [referral, setReferral] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const answered = PARQ_QUESTIONS.filter((q) => answers[q.key] !== undefined).length;
  const complete = answered === PARQ_QUESTIONS.length;

  const set = (key: string, value: boolean) => {
    setAnswers((a) => ({ ...a, [key]: value }));
    setReferral(null);
    setError(null);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api(
        'POST',
        `/members/${memberId}/parq/submit`,
        { answers, note: note.trim() || undefined },
        'MEMBER',
      );
      if (r.cleared) {
        setReferral(null);
        onCleared();
      } else {
        setReferral(r.message);
        onReferral(r.message);
      }
    } catch (e: any) {
      setError(e?.error || 'Could not send your answers. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block' }}>
          Before you start
        </Typography>
        Readiness screening
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Seven questions about your health history. Answer honestly — if anything suggests you
            should speak to a doctor first, we will say so rather than work around it.
          </Typography>

          {referral && (
            <Alert severity="warning" variant="outlined">
              <AlertTitle>Check with a physician first</AlertTitle>
              {referral}
            </Alert>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {PARQ_QUESTIONS.map((q, i) => (
            <Paper key={q.key} variant="outlined" sx={{ p: 2 }}>
              <FormControl>
                <FormLabel id={`parq-${q.key}`} sx={{ color: 'text.primary' }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.8 }}>
                      {String(i + 1).padStart(2, '0')}
                    </Typography>
                    <Typography variant="body1" component="span">{q.text}</Typography>
                  </Stack>
                </FormLabel>
                <RadioGroup
                  row
                  aria-labelledby={`parq-${q.key}`}
                  name={q.key}
                  value={answers[q.key] === undefined ? '' : answers[q.key] ? 'yes' : 'no'}
                  onChange={(e) => set(q.key, e.target.value === 'yes')}
                  sx={{ marginInlineStart: 4, mt: 1 }}
                >
                  <FormControlLabel value="no" control={<Radio />} label="No" />
                  <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                </RadioGroup>
              </FormControl>
            </Paper>
          ))}

          <TextField
            label="Anything else we should know (optional)"
            multiline
            minRows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', flex: 1 }}>
          {answered} of {PARQ_QUESTIONS.length} answered
        </Typography>
        <Button variant="text" onClick={onClose} disabled={busy}>Close</Button>
        <Button variant="contained" onClick={submit} disabled={!complete || busy}>
          {busy ? 'Sending…' : 'Submit screening'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
