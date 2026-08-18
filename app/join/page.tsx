'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Link from 'next/link';
import { signUp } from '@/lib/auth-client';
import { completeMemberRegistration, getActiveSites } from '@/lib/actions/memberAuth';
import { copy } from '@/components/member/copy';

type Site = { id: string; name: string; city: string };

/* Self-registration — no staff step (blueprint Phase 2 exit criterion).
   Signup runs client-side via authClient.signUp.email so the browser
   receives the session cookie the normal way; completeMemberRegistration
   (a server action) then reads that live session to finish the domain
   write. See docs/adr/0014. */
export default function JoinPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [siteId, setSiteId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getActiveSites().then((rows) => {
      setSites(rows);
      if (rows.length === 1) setSiteId(rows[0].id);
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await signUp.email(
      { email, password, name },
      {
        onSuccess: async () => {
          try {
            await completeMemberRegistration({ phone, siteId });
            router.push('/member');
          } catch {
            setError(copy.join.genericError);
            setLoading(false);
          }
        },
        onError: (ctx) => {
          setError(ctx.error.message || copy.join.genericError);
          setLoading(false);
        },
      },
    );
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Paper variant="outlined" sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Stack spacing={3} component="form" onSubmit={onSubmit}>
          <Box>
            <Typography variant="overline" color="text.secondary">{copy.join.brand}</Typography>
            <Typography variant="h5">{copy.join.heading}</Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label={copy.join.name} value={name} onChange={(e) => setName(e.target.value)} required />
          <TextField label={copy.join.phone} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <TextField
            label={copy.join.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <TextField
            label={copy.join.password}
            type="password"
            helperText={copy.join.passwordHelper}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <TextField select label={copy.join.site} value={siteId} onChange={(e) => setSiteId(e.target.value)} required>
            {sites.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name} — {s.city}
              </MenuItem>
            ))}
          </TextField>
          <Button type="submit" variant="contained" size="large" disabled={loading || !siteId}>
            {loading ? copy.join.submitting : copy.join.submit}
          </Button>
          <Typography variant="body2" color="text.secondary">
            {copy.join.haveAccount}{' '}
            <Link href="/member/login">{copy.join.signInLink}</Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
