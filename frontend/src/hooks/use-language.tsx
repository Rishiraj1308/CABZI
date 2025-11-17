
'use client'

import { useContext } from 'react';
// Correctly import the context and type from the new central provider file
import { LanguageContext, LanguageContextType } from '@/context/language-provider';

// This hook is now just a simple consumer of the context.
// All logic is encapsulated within LanguageProvider.
export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
