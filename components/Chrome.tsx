'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { api } from '@/lib/store';
import { ApiPanel, DataPanel } from './Panels';

type Props = {
  current: 'member' | 'coach' | 'admin';
  label: string;
  snap: any;
  refresh: () => void;
  msg: string | null;
  children: React.ReactNode;
};

/* Shared chrome for the three authenticated routes. Not a security boundary —
   the segment switcher and "Open as" flows just set a plain identity cookie
   (see lib/session.ts). Data-visibility panels (API log, DB browser) are
   gated to the admin route only: a coach shouldn't be one click away from
   studio-wide business data via Settings. */
export default function Chrome({ current, label, snap, refresh, msg, children }: Props) {
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [dock, setDock] = useState<'none' | 'api' | 'data'>('none');

  const switchTo = async (kind: 'member' | 'coach' | 'admin') => {
    if (kind === current) return;
    const id = kind === 'member' ? snap.members[0]?.id : kind === 'coach' ? snap.coaches[0]?.id : 'admin';
    if (!id) return;
    await fetch('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, id }),
    }).catch(() => {});
    router.push(kind === 'member' ? '/member' : kind === 'coach' ? '/coach' : '/admin');
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

  return (
    <>
      <AppBar position="sticky" color="primary" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="div" sx={{ fontFamily: 'var(--font-bricolage)' }}>
            MAR<Box component="i" sx={{ color: 'secondary.main', fontStyle: 'normal' }}>N</Box>
          </Typography>
          <Typography variant="overline" sx={{ color: 'primary.contrastText', opacity: 0.7 }}>{label}</Typography>
          <Box sx={{ flex: 1 }} />
          <ToggleButtonGroup size="small" exclusive value={current} onChange={(_, v) => v && switchTo(v)}>
            <ToggleButton value="member">Member</ToggleButton>
            <ToggleButton value="coach">Coach</ToggleButton>
            <ToggleButton value="admin">Admin</ToggleButton>
          </ToggleButtonGroup>
          <IconButton color="inherit" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Settings">
            <MoreVertIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        {current === 'admin' && [
          <MenuItem key="api" onClick={() => { setDock(dock === 'api' ? 'none' : 'api'); setMenuAnchor(null); }}>
            <ListItemText primary="API activity" secondary="Every request and response, live" />
          </MenuItem>,
          <MenuItem key="data" onClick={() => { setDock(dock === 'data' ? 'none' : 'data'); setMenuAnchor(null); }}>
            <ListItemText primary="Database rows" secondary="Read straight from Postgres" />
          </MenuItem>,
          <Divider key="sep" />,
        ]}
        <MenuItem onClick={switchAccount}>
          <ListItemText primary="Switch account" secondary="Back to the persona picker" />
        </MenuItem>
        <MenuItem onClick={resetDemo}>
          <ListItemText primary="Reset demo data" secondary="Wipes everything, re-seeds the personas" />
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
