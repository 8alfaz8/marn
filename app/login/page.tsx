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
import { signIn } from '@/lib/auth-client';

/* Staff-only login — email + password for now, phone-OTP deferred
   (docs/adr/0009). No public sign-up link here on purpose: staff accounts
   are created by a studio manager or the one-time db/seed.ts bootstrap,
   never self-service. */
export default function LoginPage() {
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
        onSuccess: () => router.push('/'),
        onError: (ctx) => {
          setError(ctx.error.message || 'Sign in failed');
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
            <Typography variant="overline" color="text.secondary">Marn</Typography>
            <Typography variant="h5">Staff sign in</Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <Button type="submit" variant="contained" size="large" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
