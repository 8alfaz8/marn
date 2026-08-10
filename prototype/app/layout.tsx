import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Petrona, Figtree } from 'next/font/google';
import theme from '@/theme/theme';

// Brand handoff's two families: Petrona (serif, display) and Figtree (sans,
// UI/body/numerals — no monospace anywhere in this system). See theme.ts.
const petrona = Petrona({ subsets: ['latin'], weight: ['300', '400', '500'], style: ['normal', 'italic'], display: 'swap', variable: '--font-petrona' });
const figtree = Figtree({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-figtree' });

export const metadata: Metadata = {
  title: 'Marn — Recovery, measured',
  description: 'Assisted stretching and recovery, tracked in degrees. Member app and coach console.',
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, themeColor: '#0C1210', viewportFit: 'cover',
  // The app is dark-first by brand design (theme.ts palette.mode is fixed
  // 'dark'). Without this, phones in system *light* mode could apply a
  // forced/auto-light heuristic that shifts the hardcoded status-band and
  // brand hues away from their real values — same class of bug as the
  // inverse fixed light-only build had, see prototype/decisions.md.
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${petrona.variable} ${figtree.variable}`}>
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
