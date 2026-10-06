import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { BroadcastModeProvider } from '@property-studio/ui';

import './globals.css';

/**
 * Mockup uses a professional sans-serif system.
 * Single family avoids Turbopack multi-font google loader issues while preserving
 * clear display vs body hierarchy via weight.
 */
const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'Property Studio',
    template: '%s · Property Studio',
  },
  description:
    'Property intelligence platform for India — marketplace, communities, and professional workflows.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN">
      <body
        className={`${sans.variable} antialiased`}
        style={{ ['--font-display' as string]: 'var(--font-body)' }}
      >
        <BroadcastModeProvider>{children}</BroadcastModeProvider>
      </body>
    </html>
  );
}
