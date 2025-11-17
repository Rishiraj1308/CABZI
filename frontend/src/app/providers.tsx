
'use client';

import { ThemeProvider } from '@/components/shared/theme-provider';
import { LanguageProvider } from '@/context/language-provider';
import { FirebaseProviderClient } from '@/lib/firebase/client-provider';
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
        <FirebaseProviderClient>
          {children}
        </FirebaseProviderClient>
      </ThemeProvider>
    </LanguageProvider>
  );
}
