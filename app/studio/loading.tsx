import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

/* Shown while the site's day is being read. Matches the console's own shape —
   four stat tiles over a wide panel — so the layout doesn't jump when the
   real numbers land. */
export default function StudioLoading() {
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={3}>
        <Grid container spacing={2}>
          {[0, 1, 2, 3].map((tile) => (
            <Grid key={tile} size={{ xs: 6, md: 3 }}>
              <Skeleton variant="rounded" height={104} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={48} />
        <Skeleton variant="rounded" height={320} />
      </Stack>
    </Box>
  );
}
