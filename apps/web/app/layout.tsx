import type { Metadata } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import type { ReactNode } from 'react';
import { BroadcastModeProvider } from '@property-studio/ui';

import './globals.css';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
});

const body = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
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
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <BroadcastModeProvider>{children}</BroadcastModeProvider>
      </body>
    </html>
  );
}
