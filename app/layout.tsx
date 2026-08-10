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
    <html lang="en" dir="ltr" className={`${petrona.variable} ${figtree.variable}`}>
      <body>
        <InitColorSchemeScript attribute="data-mui-color-scheme" defaultMode="dark" />
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
