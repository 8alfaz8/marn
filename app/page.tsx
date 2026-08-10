import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function Home() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', p: 4, textAlign: 'center' }}>
      <Typography variant="h4" component="h1" gutterBottom>Marn</Typography>
      <Typography variant="body1" color="text.secondary">
        The real product build starts here. See docs/architecture/overview.md for what&apos;s mapped and not yet built.
      </Typography>
    </Box>
  );
}
