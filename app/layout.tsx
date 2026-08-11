import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Petrona, Figtree } from 'next/font/google';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import theme from '@/theme/theme';

const petrona = Petrona({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-petrona',
  display: 'swap',
});
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-figtree',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Marn',
  description: 'Recovery, measured.',
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  // Dark-first brand — let mobile browsers render both schemes natively.
  colorScheme: 'dark light',
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
      // treating it as a bug (https://mui.com/material-ui/react-init-color-scheme-script/).
      suppressHydrationWarning
    >
      <body>
        <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="dark" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          {/* defaultMode here is a *separate* prop from InitColorSchemeScript's
              own defaultMode above — without it, ThemeProvider's runtime mode
              state defaults to 'system' and overwrites the script's dark
              attribute after hydration, regardless of theme.defaultColorScheme.
              Confirmed by reading MUI's ThemeProviderWithVars/CssVarsProvider
              source, not guessed; caught via a real browser check, not tsc. */}
          <ThemeProvider theme={theme} defaultMode="dark">
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
