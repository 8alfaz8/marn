'use client';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';

/* ---------------------------------------------------------------------------
   Loading states that mirror the real layout, not a bare "Loading…" line —
   every console (Gate/Member/Coach/Manager/Admin) has a different shape, so
   each gets its own skeleton rather than one generic spinner. Built entirely
   from MUI's <Skeleton> (built-in wave animation), matching the design
   system's "MUI strictly" rule — no custom shimmer CSS.

   These render standalone (not inside Chrome) since the four consoles all
   guard on `!snap` before Chrome mounts — Chrome needs data this pass
   doesn't have yet (the signed-in person's name). Each skeleton's own header
   band stands in for the app bar so the transition isn't a jump from "empty
   page" to "full chrome", just placeholder-shapes to real content in place.
--------------------------------------------------------------------------- */

const radiusLg = 3; // MuiSkeleton's `sx` borderRadius isn't the sx-multiplier trap (no theme.marn here) — plain spacing units are fine.

function HeaderBand({ tabs = 0 }: { tabs?: number }) {
  return (
    <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', px: 2, py: 1.5, flexWrap: 'wrap' }}>
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="text" width={64} height={28} />
        <Box sx={{ flex: 1 }} />
        <Skeleton variant="rounded" width={200} height={36} sx={{ borderRadius: 999 }} />
        <Skeleton variant="rounded" width={168} height={36} sx={{ borderRadius: 999 }} />
      </Stack>
      {tabs > 0 && (
        <Stack direction="row" spacing={4} sx={{ px: 2, pb: 2 }}>
          {Array.from({ length: tabs }).map((_, i) => (
            <Skeleton key={i} variant="text" width={64} height={24} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

function StatRow({ count = 4 }: { count?: number }) {
  return (
    <Stack direction="row" spacing={4} sx={{ mb: 4, flexWrap: 'wrap' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Box key={i}>
          <Skeleton variant="text" width={64} height={16} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" width={48} height={40} />
        </Box>
      ))}
    </Stack>
  );
}

/** Coach/Manager/Admin shape: header band + tabs + stat row + a big card and a side card. */
export function ConsoleSkeleton({ tabs = 3, statCount = 4 }: { tabs?: number; statCount?: number }) {
  return (
    <Box>
      <HeaderBand tabs={tabs} />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Skeleton variant="text" width={180} height={18} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width={300} height={44} sx={{ mb: 3 }} />
        <StatRow count={statCount} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Skeleton variant="rounded" height={380} sx={{ borderRadius: radiusLg }} />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Skeleton variant="rounded" height={380} sx={{ borderRadius: radiusLg }} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

/** Member *body* shape only (hero ring card, three stat tiles, a list row) —
 * Member.tsx already renders the real Chrome (app bar + bottom nav) while
 * its own snapshot is still loading, so only the content area needs a
 * placeholder here, not a second fake header/nav on top of the real one. */
export function MemberBodySkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width={90} height={18} />
      <Skeleton variant="text" width={220} height={36} sx={{ mb: 2 }} />
      <Skeleton variant="rounded" height={180} sx={{ borderRadius: radiusLg, mb: 2 }} />
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={84} sx={{ flex: 1, borderRadius: 2 }} />
        ))}
      </Stack>
      <Skeleton variant="rounded" height={90} sx={{ borderRadius: radiusLg }} />
    </Box>
  );
}

/** Gate (landing) shape: hero text block + sign-in card, before /api/directory answers. */
export function GateSkeleton() {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="text" width={220} height={18} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="90%" height={56} />
          <Skeleton variant="text" width="60%" height={56} sx={{ mb: 3 }} />
          <Skeleton variant="text" width="100%" height={22} />
          <Skeleton variant="text" width="80%" height={22} sx={{ mb: 4 }} />
          <Stack direction="row" spacing={4}>
            {[1, 2, 3].map((i) => (
              <Box key={i}>
                <Skeleton variant="text" width={40} height={38} />
                <Skeleton variant="text" width={80} height={16} />
              </Box>
            ))}
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Skeleton variant="text" width={100} height={18} sx={{ mb: 1 }} />
          <Skeleton variant="rounded" height={44} sx={{ borderRadius: 999, mb: 2 }} />
          <Skeleton variant="rounded" height={220} sx={{ borderRadius: radiusLg }} />
        </Grid>
      </Grid>
    </Container>
  );
}
