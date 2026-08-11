'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { copy } from '@/components/studio/copy';

/* Nothing from the caught error is rendered or logged: a failure on this
   route can carry member identifiers, and those never leave the server
   (Iron Rule — health data and member identifiers stay out of logs, traces,
   and error reports). The manager gets a way forward instead. */
export default function StudioError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={reset}>
            {copy.error.retry}
          </Button>
        }
      >
        <AlertTitle>{copy.error.title}</AlertTitle>
        {copy.error.body}
      </Alert>
    </Box>
  );
}
