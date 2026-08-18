'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import Snackbar from '@mui/material/Snackbar';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import { api } from '@/lib/store';
import { SITES, siteById } from '@/lib/reference';
import { ApiPanel, DataPanel } from './Panels';
import { PremiumCard, ThemeToggle } from './premium';
import { GateSkeleton } from './skeletons';

type Category = 'manager' | 'coach' | 'member';
type Person = { id: string; name: string; siteId: string };
type Directory = { sites: typeof SITES; managers: Person[]; coaches: (Person & { title: string })[]; members: Person[] };

const CATEGORY_LABEL: Record<Category, string> = { manager: 'Studio manager', coach: 'Coach', member: 'User' };

/* The whole point of this file being a single module-scope component (never
   an inline function defined inside another component's body) is that the
   signup <TextField>s and the category/person pickers keep their identity —
   and their focus — across every re-render. See CLAUDE.md's "Known trap"
   note. This surface fetches the lightweight GET /directory (id/name/site
   only), not the full snapshot — with 150 members across three studios the
   whole-database poll the old persona-card picker used would be needless
   weight on the one page every demo session starts from. */
export default function Gate() {
  const router = useRouter();
  const [dir, setDir] = useState<Directory | null>(null);
  const [signup, setSignup] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', goal: '', siteId: SITES[0].id });
  const [category, setCategory] = useState<Category>('member');
  const [siteFilter, setSiteFilter] = useState<'all' | string>('all');
  const [person, setPerson] = useState<Person | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [dock, setDock] = useState<'none' | 'api' | 'data'>('none');
  const toast = (s: string) => { setMsg(s); setTimeout(() => setMsg(null), 2800); };

  const loadDirectory = () => fetch('/api/directory').then((r) => r.json()).then(setDir).catch(() => {});
  useEffect(() => { loadDirectory(); }, []);

  if (!dir) return <GateSkeleton />;

  const openAs = async (kind: Category | 'admin', id: string) => {
    await fetch('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, id }),
    });
    router.push(kind === 'member' ? '/member' : kind === 'coach' ? '/coach' : kind === 'manager' ? '/manager' : '/admin');
  };

  const createMember = async () => {
    if (!form.name.trim()) return;
    try {
      const r = await api('POST', '/members', { ...form, parqCleared: false }, 'MEMBER');
      await openAs('member', r.memberId);
    } catch (e: any) { toast(e.error || 'Could not create account'); }
  };

  const pool: Person[] = category === 'manager' ? dir.managers : category === 'coach' ? dir.coaches : dir.members;
  const filteredPool = siteFilter === 'all' ? pool : pool.filter((p) => p.siteId === siteFilter);

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', p: 1 }}>
        <ThemeToggle />
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
          try { await api('POST', '/admin/seed', {}, 'SYSTEM'); await loadDirectory(); setPerson(null); toast('Demo data reset — three studios re-seeded'); }
          catch { toast('Reset failed'); }
        }}>
          <ListItemText primary="Reset demo data" secondary="Wipes everything, re-seeds three studios" />
        </MenuItem>
      </Menu>

      <Box
        sx={(t) => ({
          backgroundImage:
            'radial-gradient(120% 50% at 12% -10%, rgba(200,164,106,.16) 0%, rgba(200,164,106,0) 60%), ' +
            'radial-gradient(90% 40% at 100% 0%, rgba(143,203,184,.12) 0%, rgba(143,203,184,0) 65%)',
          backgroundRepeat: 'no-repeat',
        })}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="overline" color="text.secondary">Recovery studio · UAE · prototype</Typography>
              <Typography variant="h1" sx={{ fontSize: { xs: 40, md: 56 }, mt: 1 }}>
                Stretching<br />you can <Box component="em" sx={{ color: 'secondary.dark', fontStyle: 'normal' }}>measure</Box>.
              </Typography>
              <Typography variant="body1" sx={{ mt: 3, maxWidth: '54ch' }}>
                Every session produces numbers: joint angle in degrees, pain before and after, how much range came back.
                Members watch the line move. Coaches work from evidence instead of memory. Three studios, one system.
              </Typography>
              <Stack direction="row" spacing={4} sx={{ mt: 4, flexWrap: 'wrap' }}>
                {[[String(SITES.length), 'Studios'], ['10', 'Muscle groups measured'], ['30′', 'Base session']].map(([n, l]) => (
                  <Box key={l}>
                    <Typography variant="readout" sx={{ fontSize: 38, display: 'block' }}>{n}</Typography>
                    <Typography variant="overline" color="text.secondary">{l}</Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={2}>
                <Typography variant="overline" color="text.secondary">Sign in as</Typography>

                <ToggleButtonGroup
                  exclusive fullWidth value={category}
                  onChange={(_, v) => { if (v) { setCategory(v); setPerson(null); } }}
                >
                  {(['manager', 'coach', 'member'] as Category[]).map((c) => (
                    <ToggleButton key={c} value={c}>{CATEGORY_LABEL[c]}</ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <PremiumCard sx={{ p: 2.5 }}>
                  <Stack spacing={1.5}>
                    <ToggleButtonGroup size="small" exclusive value={siteFilter} onChange={(_, v) => v && setSiteFilter(v)} sx={{ flexWrap: 'wrap' }}>
                      <ToggleButton value="all">All studios</ToggleButton>
                      {SITES.map((s) => <ToggleButton key={s.id} value={s.id}>{s.name.replace('Marn — ', '')}</ToggleButton>)}
                    </ToggleButtonGroup>

                    <Autocomplete
                      options={filteredPool}
                      value={person}
                      onChange={(_, v) => setPerson(v)}
                      getOptionLabel={(p) => p.name}
                      isOptionEqualToValue={(a, b) => a.id === b.id}
                      renderOption={(props, p) => (
                        <li {...props} key={p.id}>
                          {p.name} — {siteById(p.siteId)?.name}
                        </li>
                      )}
                      renderInput={(params) => (
                        <TextField {...params} label={`${CATEGORY_LABEL[category]} — search by number or studio`} />
                      )}
                    />

                    <Button
                      variant="contained"
                      size="large"
                      disabled={!person}
                      onClick={() => person && openAs(category, person.id)}
                    >
                      Continue as {person ? person.name : CATEGORY_LABEL[category].toLowerCase()}
                    </Button>
                  </Stack>
                </PremiumCard>

                {category === 'member' && (
                  !signup ? (
                    <PremiumCard hover sx={{ p: 2 }} onClick={() => setSignup(true)}>
                      <Typography variant="subtitle1">Create an account instead</Typography>
                      <Typography variant="body2" color="text.secondary">Start genuinely empty and walk the onboarding yourself.</Typography>
                    </PremiumCard>
                  ) : (
                    <PremiumCard sx={{ p: 2.5, borderColor: 'secondary.main' }}>
                      <Typography variant="overline" color="text.secondary">New member</Typography>
                      <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                        <TextField label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        <TextField label="Phone" placeholder="+971 5x xxx xxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        <TextField label="What you want to fix" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
                        <TextField select label="Studio" value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })}>
                          {SITES.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                        </TextField>
                        <Stack direction="row" spacing={1}>
                          <Button variant="contained" disabled={!form.name.trim()} onClick={createMember}>Create</Button>
                          <Button variant="text" onClick={() => setSignup(false)}>Cancel</Button>
                        </Stack>
                      </Stack>
                    </PremiumCard>
                  )
                )}

                <Divider sx={{ my: 1 }} />
                <PremiumCard hover sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'center' }}
                       onClick={() => openAs('admin', 'admin')}>
                  <Box sx={{
                    width: 44, height: 44, borderRadius: (t) => `${t.marn.radius.md}px`, flexShrink: 0,
                    bgcolor: 'background.raised', display: 'grid', placeItems: 'center',
                  }}>
                    <AdminPanelSettingsOutlinedIcon color="secondary" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1">Platform admin</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Cross-studio revenue, capacity, coach outcomes, full member roster — all {SITES.length} studios.
                    </Typography>
                  </Box>
                </PremiumCard>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {dock === 'api' && <ApiPanel onClose={() => setDock('none')} />}
      {dock === 'data' && <DataPanel onClose={() => setDock('none')} />}
      <Snackbar open={!!msg} message={msg} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </>
  );
}
