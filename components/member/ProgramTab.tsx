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

/** Placeholder for a future in-house move video (item #13) — a rounded
 *  gradient tile (the ambient-wash token, `theme/theme.ts`, no hardcoded
 *  hex) with a centered play glyph, one per move, matching the prototype's
 *  `MoveThumbnail` (`prototype/components/Member.tsx`). Drawn as a CSS
 *  border-triangle rather than `@mui/icons-material`'s `PlayCircleOutline`
 *  the prototype uses — that package isn't a root dependency, and adding
 *  one is a "major change" this pass doesn't have sign-off for (CLAUDE.md).
 *  `borderInlineStart` so the glyph's point follows text direction in RTL.
 *  Module scope per CLAUDE.md's known trap. */
function MoveThumbnail() {
  return (
    <Box
      aria-hidden
      sx={{
        inlineSize: 56,
        blockSize: 56,
        flexShrink: 0,
        borderRadius: 1.5,
        backgroundImage: (t) => t.marn.ambientWash.jade,
        backgroundColor: 'surfaceRaised',
        border: '1px solid',
        borderColor: 'divider',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Box
        sx={{
          inlineSize: 0,
          blockSize: 0,
          borderBlockStart: '9px solid transparent',
          borderBlockEnd: '9px solid transparent',
          borderInlineStart: '14px solid',
          borderInlineStartColor: 'primary.main',
          marginInlineStart: '3px',
        }}
      />
    </Box>
  );
}

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
          <Box key={m.name} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <MoveThumbnail />
            <Box>
              <Typography variant="body1">{m.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {m.description} ({m.targetMins} min)
              </Typography>
            </Box>
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
