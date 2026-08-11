'use client';

import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import { copy } from './copy';

/* Member-facing shell — deliberately lighter than components/StaffChrome.tsx
   (no role chip, no impersonation switcher, those are staff-only concepts).
   Module-scope per CLAUDE.md's known trap. */
export default function MemberChrome({ name, children }: { name: string; children: React.ReactNode }) {
  const router = useRouter();

  const onSignOut = async () => {
    await signOut();
    router.push('/member/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0} sx={{ borderBlockEnd: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="span" sx={{ fontFamily: 'var(--font-petrona), serif' }}>
            Marn
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" color="text.secondary">{name}</Typography>
          <Button size="small" onClick={onSignOut}>{copy.console.signOut}</Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
    </Box>
  );
}
