import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import theme from '@/theme/theme';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', variable: '--font-bricolage' });
const instrument = Instrument_Sans({ subsets: ['latin'], display: 'swap', variable: '--font-instrument' });
const mono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Marn — Recovery, measured',
  description: 'Assisted stretching and recovery, tracked in degrees. Member app and coach console.',
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, themeColor: '#10130E', viewportFit: 'cover',
  // The app is light-only (no dark palette built yet — theme.ts palette.mode
  // is fixed 'light'). Without this, phones with system dark mode on apply
  // their browser's forced/auto-dark heuristic to the page, which shifts the
  // hardcoded status colours (restricted/limited/optimal/excellent) on the
  // body map away from their real hex values. Desktop browsers rarely force
  // this, which is why it only showed up on mobile.
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${bricolage.variable} ${instrument.variable} ${mono.variable}`}>
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
