'use client';

import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { getMyProgram, markProgramComplete } from '@/lib/actions/programs';
import { copy } from './copy';

type Program = Awaited<ReturnType<typeof getMyProgram>>;

/* Module-scope per CLAUDE.md's known trap. No streak number shown — a
   dedicated streak/milestone concept is blueprint §4.1.5 territory, not
   built at root yet; this shows what's real (the programme, completion
   count) rather than inventing a streak ahead of that. */
export default function ProgramTab() {
  const [program, setProgram] = useState<Program | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    void getMyProgram().then(setProgram);
  };

  useEffect(refresh, []);

  const today = new Date().toISOString().slice(0, 10);
  const doneToday = program?.completions.includes(today) ?? false;

  const onComplete = async () => {
    if (!program) return;
    setError(null);
    setBusy(true);
    try {
      await markProgramComplete(program.id);
      refresh();
    } catch {
      setError(copy.myProgram.failed);
    } finally {
      setBusy(false);
    }
  };

  if (program === undefined) return null;

  if (!program) {
    return (
      <Typography variant="body2" color="text.secondary">{copy.myProgram.empty}</Typography>
    );
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 480 }}>
      <Typography variant="h6">{program.title}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack spacing={1.5}>
        {program.moves.map((m) => (
          <Box key={m.name}>
            <Typography variant="body1">{m.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {m.description} ({m.targetMins} min)
            </Typography>
          </Box>
        ))}
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {copy.myProgram.completions(program.completions.length)}
      </Typography>
      <Box>
        <Button variant="contained" disabled={busy || doneToday} onClick={onComplete}>
          {doneToday ? copy.myProgram.doneToday : copy.myProgram.markComplete}
        </Button>
      </Box>
    </Stack>
  );
}
