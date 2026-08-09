'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { api, useSnapshot } from '@/lib/store';
import { SITE, PERSONAS } from '@/lib/reference';
import { ApiPanel, DataPanel } from './Panels';

/* The whole point of this file being a single module-scope component (never
   an inline function defined inside another component's body) is that the
   signup <TextField>s keep their identity — and their focus — across every
   re-render, including the 5-second snapshot poll. See CLAUDE.md's "Known
   trap" note. This is the fix for the original focus-loss bug. */
export default function Gate() {
  const router = useRouter();
  const { data: snap, refresh } = useSnapshot();
  const [signup, setSignup] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', goal: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [dock, setDock] = useState<'none' | 'api' | 'data'>('none');
  const toast = (s: string) => { setMsg(s); setTimeout(() => setMsg(null), 2800); };

  if (!snap) return <Container sx={{ py: 6 }}><Typography variant="overline">Loading…</Typography></Container>;

  const openAs = async (kind: 'member' | 'coach' | 'admin', id: string) => {
    await fetch('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, id }),
    });
    router.push(kind === 'member' ? '/member' : kind === 'coach' ? '/coach' : '/admin');
  };

  const createMember = async () => {
    if (!form.name.trim()) return;
    try {
      const r = await api('POST', '/members', { ...form, parqCleared: false }, 'MEMBER');
      await openAs('member', r.memberId);
    } catch (e: any) { toast(e.error || 'Could not create account'); }
  };

  const personas = PERSONAS
    .map((p) => ({ ...p, member: snap.members.find((m: any) => m.persona === p.id) }))
    .filter((p) => p.member);

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
        <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Debug tools">
          <MoreVertIcon />
        </IconButton>
      </Box>
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setDock('api'); setMenuAnchor(null); }}>
          <ListItemText primary="API activity" secondary="Every request and response, live" />
        </MenuItem>
        <MenuItem onClick={() => { setDock('data'); setMenuAnchor(null); }}>
          <ListItemText primary="Database rows" secondary="Read straight from Postgres" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={async () => {
          setMenuAnchor(null);
          try { await api('POST', '/admin/seed', {}, 'SYSTEM'); await refresh(); toast('Demo data reset'); }
          catch { toast('Reset failed'); }
        }}>
          <ListItemText primary="Reset demo data" secondary="Wipes everything, re-seeds the personas" />
        </MenuItem>
      </Menu>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="overline" color="text.secondary">Recovery studio · Dubai · prototype</Typography>
            <Typography variant="h1" sx={{ fontSize: { xs: 40, md: 56 }, mt: 1 }}>
              Stretching<br />you can <Box component="em" sx={{ color: 'secondary.dark', fontStyle: 'normal' }}>measure</Box>.
            </Typography>
            <Typography variant="body1" sx={{ mt: 3, maxWidth: '54ch' }}>
              Every session produces numbers: joint angle in degrees, pain before and after, how much range came back.
              Members watch the line move. Coaches work from evidence instead of memory.
            </Typography>
            <Stack direction="row" spacing={4} sx={{ mt: 4, flexWrap: 'wrap' }}>
              {[['10', 'Muscle groups measured'], ['100', 'AED per session'], ['30′', 'Base session']].map(([n, l]) => (
                <Box key={l}>
                  <Typography variant="readout" sx={{ fontSize: 38, display: 'block' }}>{n}</Typography>
                  <Typography variant="overline" color="text.secondary">{l}</Typography>
                </Box>
              ))}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <Typography variant="overline" color="text.secondary">Open as a member</Typography>
              {personas.map((p) => (
                <Paper key={p.id} variant="outlined" sx={{ p: 2, cursor: 'pointer' }}
                       onClick={() => openAs('member', p.member.id)}>
                  <Chip size="small" label={p.id === 'new' ? 'Day one' : p.id === 'power' ? 'Nine months in' : 'Four months in'} sx={{ mb: 1 }} />
                  <Typography variant="subtitle1">{p.member.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{p.blurb}</Typography>
                </Paper>
              ))}

              {!signup ? (
                <Paper variant="outlined" sx={{ p: 2, cursor: 'pointer' }} onClick={() => setSignup(true)}>
                  <Typography variant="subtitle1">Create an account</Typography>
                  <Typography variant="body2" color="text.secondary">Start genuinely empty and walk the onboarding yourself.</Typography>
                </Paper>
              ) : (
                <Paper variant="outlined" sx={{ p: 2, borderColor: 'secondary.main' }}>
                  <Typography variant="overline" color="text.secondary">New member</Typography>
                  <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                    <TextField label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <TextField label="Phone" placeholder="+971 5x xxx xxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    <TextField label="What you want to fix" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
                    <Stack direction="row" spacing={1}>
                      <Button variant="contained" disabled={!form.name.trim()} onClick={createMember}>Create</Button>
                      <Button variant="text" onClick={() => setSignup(false)}>Cancel</Button>
                    </Stack>
                  </Stack>
                </Paper>
              )}

              <Divider sx={{ my: 1 }} />
              <Typography variant="overline" color="text.secondary">Open as staff</Typography>
              {snap.coaches.slice(0, 3).map((c: any) => (
                <Paper key={c.id} variant="outlined" sx={{ p: 2, cursor: 'pointer' }} onClick={() => openAs('coach', c.id)}>
                  <Chip size="small" label="Laptop or tablet" sx={{ mb: 1 }} />
                  <Typography variant="subtitle1">{c.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{c.title} · {SITE.name}</Typography>
                </Paper>
              ))}
              <Paper variant="outlined" sx={{ p: 2, cursor: 'pointer' }} onClick={() => openAs('admin', 'admin')}>
                <Chip size="small" color="secondary" label="Studio admin" sx={{ mb: 1 }} />
                <Typography variant="subtitle1">Business & CRM view</Typography>
                <Typography variant="body2" color="text.secondary">Revenue, capacity, coach outcomes, full member roster.</Typography>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      {dock === 'api' && <ApiPanel onClose={() => setDock('none')} />}
      {dock === 'data' && <DataPanel onClose={() => setDock('none')} />}
      <Snackbar open={!!msg} message={msg} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </>
  );
}
