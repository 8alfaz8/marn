'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
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
import UnfoldLessOutlinedIcon from '@mui/icons-material/UnfoldLessOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlineOutlined';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import { api } from '@/lib/store';
import { SITES, siteById } from '@/lib/reference';
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

const COLLAPSE_KEY = 'marn_chrome_collapsed';

const ROLE_ICON: Record<Kind, React.ReactNode> = {
  member: <PersonOutlineIcon fontSize="small" />,
  coach: <FitnessCenterIcon fontSize="small" />,
  manager: <StorefrontOutlinedIcon fontSize="small" />,
  admin: <AdminPanelSettingsOutlinedIcon fontSize="small" />,
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
   member-scoped snapshot doesn't carry every other studio's roster.

   Collapsible bar (CLAUDE.md UI work — the bar was "always fully expanded"
   and ate vertical space on every screen): defaults to collapsed, persisted
   per-browser in localStorage so it doesn't reset every navigation. Collapsed
   state renders nothing in the document flow — a fixed circular button takes
   its place — so descendant consoles (Manager/Coach/Admin) that stick their
   own tab/filter row under the bar read its live rendered height off the
   `--marn-header-offset` CSS variable this component sets on the `<main>`
   wrapper, rather than guessing a constant. */
export default function Chrome({ current, currentId, label, snap, refresh, msg, children }: Props) {
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [dock, setDock] = useState<'none' | 'api' | 'data'>('none');
  const [dir, setDir] = useState<Directory | null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [siteFilter, setSiteFilter] = useState<'own' | 'all' | string>('own');
  const [barHeight, setBarHeight] = useState(0);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/api/directory').then((r) => r.json()).then(setDir).catch(() => {});
  }, []);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(COLLAPSE_KEY) : null;
    if (saved !== null) setCollapsed(saved === '1');
  }, []);

  useEffect(() => {
    if (collapsed || !barRef.current) { setBarHeight(0); return; }
    const el = barRef.current;
    const measure = () => setBarHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [collapsed]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  };

  const currentSiteId =
    current === 'coach' ? dir?.coaches.find((c) => c.id === currentId)?.siteId
    : current === 'manager' ? dir?.managers.find((m) => m.id === currentId)?.siteId
    : current === 'member' ? dir?.members.find((m) => m.id === currentId)?.siteId
    : undefined;

  /* The identity cookie is set by a plain fetch(), not a Server Action, so
     Next's own client-side back/forward cache (App Router "bfcache" — see
     next/dist/client/components/router-reducer/reducers/refresh-reducer.js,
     invalidateBfCache()) never learns it's stale: pressing the browser's back
     button after logging in could restore the snapshot of "/" from before the
     cookie existed instead of asking the server again, landing back on the
     persona picker even though the identity is still valid. router.refresh()
     is the documented way to invalidate that cache — it's what actually fixes
     the symptom, not a beforeunload/visibility hack. */
  const openAs = async (kind: Kind, id: string) => {
    await fetch('/api/session', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, id }),
    }).catch(() => {});
    router.refresh();
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
    router.refresh();
    router.push('/');
  };

  const resetDemo = async () => {
    setMenuAnchor(null);
    try { await api('POST', '/admin/seed', {}, 'SYSTEM'); await switchAccount(); } catch {}
  };

  const personPool = current === 'member' ? dir?.members : current === 'coach' ? dir?.coaches : current === 'manager' ? dir?.managers : undefined;
  /* Roster/switcher site filter, defaulted to the viewer's own site — a UX
     default, not a security gate (docs/adr/0018 point 5/6): the prototype has
     no real authorization to begin with (docs/adr/0002). */
  const filterSiteId = siteFilter === 'own' ? currentSiteId : siteFilter === 'all' ? null : siteFilter;
  const filteredPool = personPool && filterSiteId ? personPool.filter((p) => p.siteId === filterSiteId) : personPool;

  return (
    <>
      {collapsed ? (
        <Tooltip title="Show the top bar">
          <Fab
            size="medium"
            onClick={toggleCollapsed}
            aria-label="Expand top bar"
            sx={{
              position: 'fixed', insetBlockStart: 16, insetInlineEnd: 16,
              zIndex: (t) => t.zIndex.appBar + 1,
              bgcolor: 'background.raised', color: 'primary.main',
              border: '1px solid', borderColor: 'divider',
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            {ROLE_ICON[current]}
          </Fab>
        </Tooltip>
      ) : (
        <AppBar ref={barRef} position="sticky" elevation={0} sx={{ color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}>
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
              <>
                <ToggleButtonGroup
                  size="small" exclusive value={siteFilter}
                  onChange={(_, v) => v && setSiteFilter(v)}
                  sx={{ flexWrap: 'wrap' }}
                >
                  <ToggleButton value="own">Your site</ToggleButton>
                  <ToggleButton value="all">All</ToggleButton>
                  {SITES.map((s) => <ToggleButton key={s.id} value={s.id}>{s.name.replace('Marn — ', '')}</ToggleButton>)}
                </ToggleButtonGroup>
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
                  {(filteredPool ?? []).map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} — {siteById(p.siteId)?.name ?? p.siteId}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}

            <ToggleButtonGroup size="small" exclusive value={current} onChange={(_, v) => v && switchRole(v)}>
              <ToggleButton value="manager">Manager</ToggleButton>
              <ToggleButton value="coach">Coach</ToggleButton>
              <ToggleButton value="member">Member</ToggleButton>
              <ToggleButton value="admin">Admin</ToggleButton>
            </ToggleButtonGroup>
            <ThemeToggle />
            <Tooltip title="Collapse the top bar">
              <IconButton color="inherit" onClick={toggleCollapsed} aria-label="Collapse top bar">
                <UnfoldLessOutlinedIcon />
              </IconButton>
            </Tooltip>
            <IconButton color="inherit" onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Settings">
              <MoreVertIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

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

      <Box
        component="main"
        sx={{ minHeight: '100dvh', '--marn-header-offset': `${barHeight}px` } as React.CSSProperties}
      >
        {children}
      </Box>

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
