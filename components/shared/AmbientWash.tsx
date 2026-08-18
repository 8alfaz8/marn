import Box from '@mui/material/Box';

/* Item #5 — the ambient gradient wash `theme/theme.ts` already encodes
   (`theme.marn.ambientWash`, per docs/design/design-system.md's "Ambient
   wash" section) finally gets a consumer. Wraps a console's content area:
   one soft radial leak from the top edge, fading out by the middle of the
   page (product owner, batch UI/UX review, 2026-08-19) rather than every
   screen sitting on a flat background. Atmosphere only — positioned behind
   content (zIndex 0) and inert (pointerEvents: 'none') so it never
   intercepts a tap or sits "on" anything readable. No client state, so no
   'use client' needed; module scope per CLAUDE.md's known trap regardless. */
export default function AmbientWash({
  tone = 'brass',
  children,
}: {
  tone?: 'brass' | 'celadon' | 'jade';
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          insetBlockStart: 0,
          insetInlineStart: 0,
          insetInlineEnd: 0,
          blockSize: '50vh',
          backgroundImage: (t) => t.marn.ambientWash[tone],
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
    </Box>
  );
}
