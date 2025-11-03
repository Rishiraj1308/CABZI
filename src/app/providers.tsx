
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/hooks/use-language';
import { FirebaseProviderClient } from '@/firebase/client-provider';
import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';

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
          <Toaster />
        </FirebaseProviderClient>
      </ThemeProvider>
    </LanguageProvider>
  );
}
