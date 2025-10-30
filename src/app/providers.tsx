
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/hooks/use-language';
import { FirebaseProviderClient } from '@/firebase/client-provider';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <LanguageProvider>
        <FirebaseProviderClient>
          {children}
        </FirebaseProviderClient>
      </LanguageProvider>
    </ThemeProvider>
  );
}
