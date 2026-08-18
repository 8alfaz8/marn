'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import CollapsibleTopBar from '@/components/shared/CollapsibleTopBar';
import { copy } from './copy';

/* Member-facing shell — deliberately lighter than components/StaffChrome.tsx
   (no role chip, no impersonation switcher, those are staff-only concepts).
   Same collapsible top bar as StaffChrome (item #1). Module-scope per
   CLAUDE.md's known trap. */
export default function MemberChrome({ name, children }: { name: string; children: React.ReactNode }) {
  const router = useRouter();

  const onSignOut = async () => {
    await signOut();
    router.push('/member/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <CollapsibleTopBar>
        <Typography variant="h6" component="span" sx={{ fontFamily: 'var(--font-petrona), serif' }}>
          Marn
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color="text.secondary">{name}</Typography>
        <Button size="small" onClick={onSignOut}>{copy.console.signOut}</Button>
      </CollapsibleTopBar>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
    </Box>
  );
}
