'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import SwitchAccountOutlinedIcon from '@mui/icons-material/SwitchAccountOutlined';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import { api } from '@/lib/store';
import { siteById } from '@/lib/reference';
import { ApiPanel, DataPanel } from './Panels';
import { ThemeToggle } from './premium';

type Kind = 'member' | 'coach' | 'manager' | 'admin';
type Directory = {
  sites: { id: string; name: string }[];
  managers: { id: string; name: string; siteId: string }[];
  coaches: { id: string; name: string; siteId: string; title: string }[];
  members: { id: string; name: string; siteId: string }[];
};

type Props = {
  current: Kind;
  currentId: string;
  label: string;
  snap: any;
  refresh: () => void;
  msg: string | null;
  children: React.ReactNode;
};

/* Shared chrome for the four authenticated routes. Not a security boundary —
   the segment switcher and "Open as" flows just set a plain identity cookie
   (see lib/session.ts). Data-visibility panels (API log, DB browser) are
   gated to the admin route only: nobody else should be one click away from
   cross-studio business data via Settings.

   The role ToggleButtonGroup switches CATEGORY (jumps to the first person of
   that role, same studio where the current identity has one). The select
   beside it switches PERSON within the current category — any of the 165
   seeded people across all three studios, so a demo can hop straight from
   "a coach at Marina" to "a coach at Corniche" without detouring through the
   landing page. Both read from a dedicated GET /directory fetch (id/name/
   site only, no history) rather than the page's own `snap` — a coach- or
   member-scoped snapshot doesn't carry every other studio's roster. */
export default function Chrome({ current, currentId, label, snap, refresh, msg, children }: Props) {
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [dock, setDock] = useState<'none' | 'api' | 'data'>('none');
  const [dir, setDir] = useState<Directory | null>(null);

  useEffect(() => {
    fetch('/api/directory').then((r) => r.json()).then(setDir).catch(() => {});
  }, []);

  const currentSiteId =
    current === 'coach' ? dir?.coaches.find((c) => c.id === currentId)?.siteId
    : current === 'manager' ? dir?.managers.find((m) => m.id === currentId)?.siteId
    : current === 'member' ? dir?.members.find((m) => m.id === currentId)?.siteId
    : undefined;

  const openAs = async (kind: Kind, id: string) => {
    await fetch('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, id }),
    }).catch(() => {});
    router.push(kind === 'member' ? '/member' : kind === 'coach' ? '/coach' : kind === 'manager' ? '/manager' : '/admin');
  };

  const switchRole = (kind: Kind) => {
    if (kind === current || !dir) return;
    if (kind === 'admin') return openAs('admin', 'admin');
    const pool = kind === 'member' ? dir.members : kind === 'coach' ? dir.coaches : dir.managers;
    const target = (currentSiteId && pool.find((p) => p.siteId === currentSiteId)) || pool[0];
    if (target) openAs(kind, target.id);
  };

  const switchAccount = async () => {
    setMenuAnchor(null);
    await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
    router.push('/');
  };

  const resetDemo = async () => {
    setMenuAnchor(null);
    try { await api('POST', '/admin/seed', {}, 'SYSTEM'); await switchAccount(); } catch {}
  };

  const personPool = current === 'member' ? dir?.members : current === 'coach' ? dir?.coaches : current === 'manager' ? dir?.managers : undefined;

  return (
    <>
      <AppBar position="sticky" elevation={0} sx={{ color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 1 }}>
          <Box
            aria-hidden
            sx={{
              width: 32, height: 32, borderRadius: (t) => `${t.marn.radius.sm}px`, flexShrink: 0,
              bgcolor: 'background.raised', border: '1px solid', borderColor: 'primary.main',
              boxShadow: '0 0 0 3px rgba(200,164,106,.12)',
              display: 'grid', placeItems: 'center',
            }}
          >
            <Typography variant="overline" sx={{ color: 'primary.main', fontSize: '0.7rem' }}>M</Typography>
          </Box>
          <Typography variant="h6" component="div" sx={{ fontFamily: 'var(--font-petrona)' }}>
            Marn
          </Typography>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>{label}</Typography>
          <Box sx={{ flex: 1 }} />

          {personPool && personPool.length > 0 && (
            <TextField
              select size="small" value={currentId}
              onChange={(e) => openAs(current, e.target.value)}
              sx={(t) => ({
                minWidth: 220,
                '& .MuiOutlinedInput-root': {
                  borderRadius: `${t.marn.radius.pill}px`,
                  bgcolor: 'background.raised',
                },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.palette.divider },
              })}
            >
              {personPool.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} — {siteById(p.siteId)?.name ?? p.siteId}
                </MenuItem>
              ))}
            </TextField>
          )}

          <ToggleButtonGroup size="small" exclusive value={current} onChange={(_, v) => v && switchRole(v)}>
            <ToggleButton value="manager">Manager</ToggleButton>
            <ToggleButton value="coach">Coach</ToggleButton>
            <ToggleButton value="member">Member</ToggleButton>
            <ToggleButton value="admin">Admin</ToggleButton>
          </ToggleButtonGroup>
          <ThemeToggle />
          <IconButton color="inherit" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Settings">
            <MoreVertIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)} slotProps={{ paper: { sx: { minWidth: 280 } } }}>
        {current === 'admin' && [
          <MenuItem key="api" onClick={() => { setDock(dock === 'api' ? 'none' : 'api'); setMenuAnchor(null); }}>
            <ListItemIcon><CodeOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="API activity" secondary="Every request and response, live" />
          </MenuItem>,
          <MenuItem key="data" onClick={() => { setDock(dock === 'data' ? 'none' : 'data'); setMenuAnchor(null); }}>
            <ListItemIcon><StorageOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Database rows" secondary="Read straight from Postgres" />
          </MenuItem>,
          <Divider key="sep" />,
        ]}
        <MenuItem onClick={switchAccount}>
          <ListItemIcon><SwitchAccountOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Switch account" secondary="Back to the persona picker" />
        </MenuItem>
        <MenuItem onClick={resetDemo}>
          <ListItemIcon><RestartAltOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Reset demo data" secondary="Wipes everything, re-seeds three studios" />
        </MenuItem>
      </Menu>

      <Box component="main" sx={{ minHeight: '100dvh' }}>{children}</Box>

      {dock === 'api' && <ApiPanel onClose={() => setDock('none')} />}
      {dock === 'data' && <DataPanel onClose={() => setDock('none')} />}
      <Snackbar
        open={!!msg}
        message={msg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={current === 'member' ? { mb: 'calc(56px + env(safe-area-inset-bottom))' } : undefined}
      />
    </>
  );
}
