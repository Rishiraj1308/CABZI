
'use client';

import { ThemeProvider } from '@/components/shared/theme-provider';
import { LanguageProvider } from '@/context/language-provider';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ReactNode } from 'react';

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
