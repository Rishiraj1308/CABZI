'use client';

import { ThemeProvider } from '@/components/shared/theme-provider';
import { LanguageProvider } from '@/context/language-provider';
import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const FirebaseClientProvider = dynamic(
  () => import('@/lib/firebase/client-provider'),
  { ssr: false }
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
