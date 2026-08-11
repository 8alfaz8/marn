'use client';

import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';

/* Shared shell for both staff consoles. Module-scope on purpose (CLAUDE.md's
   "known trap": an inline sub-component here would remount on every parent
   re-render and could interrupt whatever the parent is polling/revalidating). */
export default function StaffChrome({
  title,
  staffName,
  role,
  children,
}: {
  title: string;
  staffName: string;
  role: 'coach' | 'studio_manager';
  children: React.ReactNode;
}) {
  const router = useRouter();

  const onSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0} sx={{ borderBlockEnd: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="span" sx={{ fontFamily: 'var(--font-petrona), serif' }}>
            Marn
          </Typography>
          <Chip
            size="small"
            label={role === 'studio_manager' ? 'Studio manager' : 'Coach'}
            color="primary"
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" color="text.secondary">{staffName}</Typography>
          <Button size="small" onClick={onSignOut}>Sign out</Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
    </Box>
  );
}
