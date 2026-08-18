'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import { shellCopy } from '@/lib/copy';
import ImpersonationSwitcher, { ImpersonationBanner, type ImpersonationOption } from './ImpersonationSwitcher';
import AmbientWash from './shared/AmbientWash';
import CollapsibleTopBar from './shared/CollapsibleTopBar';

/* One wash tone per console, echoing the brand handoff's per-tab hue
   without needing per-tab state at the staff-chrome level (item #5). */
const WASH_TONE: Record<'coach' | 'studio_manager' | 'superadmin', 'brass' | 'celadon' | 'jade'> = {
  coach: 'jade',
  studio_manager: 'brass',
  superadmin: 'celadon',
};

/* Shared shell for all three staff consoles. Module-scope on purpose
   (CLAUDE.md's "known trap": an inline sub-component here would remount on
   every parent re-render and could interrupt whatever the parent is
   polling/revalidating). */
export default function StaffChrome({
  title,
  staffName,
  role,
  impersonation,
  children,
}: {
  title: string;
  staffName: string;
  role: 'coach' | 'studio_manager' | 'superadmin';
  /* Non-null only when the *real* signed-in account is a superadmin — the
     server decides that (lib/actions/impersonation.ts), never this component,
     so no other role can render the switcher by any client-side means. */
  impersonation?: { options: ImpersonationOption[]; activeStaffId: string | null; activeName: string | null } | null;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const onSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <CollapsibleTopBar>
        <Typography variant="h6" component="span" sx={{ fontFamily: 'var(--font-petrona), serif' }}>
          Marn
        </Typography>
        <Chip size="small" label={shellCopy.chrome.roleLabel[role]} color="primary" variant="outlined" />
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Box sx={{ flexGrow: 1 }} />
        {impersonation && (
          <ImpersonationSwitcher options={impersonation.options} activeStaffId={impersonation.activeStaffId} />
        )}
        <Typography variant="body2" color="text.secondary">{staffName}</Typography>
        <Button size="small" onClick={onSignOut}>{shellCopy.chrome.signOut}</Button>
      </CollapsibleTopBar>
      {impersonation?.activeName && <ImpersonationBanner name={impersonation.activeName} />}
      <AmbientWash tone={WASH_TONE[role]}>
        <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>
      </AmbientWash>
    </Box>
  );
}
