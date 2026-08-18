'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Link from 'next/link';
import { signIn } from '@/lib/auth-client';
import { copy } from '@/components/member/copy';

/* Member sign-in — mirrors app/login/page.tsx's structure exactly (same
   signIn.email client call, same better-auth instance, docs/adr/0014) with
   member-facing copy and a link to /join instead of no-sign-up-here. */
export default function MemberLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await signIn.email(
      { email, password },
      {
        onSuccess: () => router.push('/member'),
        onError: (ctx) => {
          setError(ctx.error.message || copy.login.genericError);
          setLoading(false);
        },
      },
    );
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Paper variant="outlined" sx={{ p: 4, width: '100%', maxWidth: 360 }}>
        <Stack spacing={3} component="form" onSubmit={onSubmit}>
          <Box>
            <Typography variant="overline" color="text.secondary">{copy.login.brand}</Typography>
            <Typography variant="h5">{copy.login.heading}</Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label={copy.login.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <TextField
            label={copy.login.password}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? copy.login.submitting : copy.login.submit}
          </Button>
          <Typography variant="body2" color="text.secondary">
            {copy.login.noAccount}{' '}
            <Link href="/join">{copy.login.joinLink}</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
