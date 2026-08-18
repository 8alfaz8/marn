import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
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
  width: 'device-width', initialScale: 1, themeColor: '#FFFFFF', viewportFit: 'cover',
  // Light is the default scheme now (dark stays reachable via the toggle in
  // Chrome.tsx/Gate.tsx) — let mobile browsers render either natively rather
  // than forcing one, same reasoning as the root product's own `'dark light'`.
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${petrona.variable} ${figtree.variable}`}
      // InitColorSchemeScript sets data-mui-color-scheme after this markup is
      // sent, which is a real, expected client/server mismatch on this one
      // attribute — MUI's own docs recommend suppressing it here rather than
      // treating it as a bug (see the root product's identical setup).
      suppressHydrationWarning
    >
      <body>
        <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="light" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          {/* defaultMode here is a *separate* prop from InitColorSchemeScript's
              own defaultMode above — without it, ThemeProvider's runtime mode
              state defaults to 'system' and overwrites the script's light
              attribute after hydration, regardless of theme.defaultColorScheme.
              See theme.ts's header comment / the root product's identical fix. */}
          <ThemeProvider theme={theme} defaultMode="light">
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
