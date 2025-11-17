'use client'

import React, { createContext, useContext, useMemo, useCallback, useSyncExternalStore, type ReactNode } from 'react';
import { translations, type Locale } from '@/lib/translations';

interface LanguageContextType {
  language: Locale;
  setLanguage: (language: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// =================================================================
// Store logic for useSyncExternalStore
// This helps to safely subscribe to external sources like localStorage
// without causing hydration mismatches or blocking the main thread.
// =================================================================

let languageStore: Locale = 'en';
const listeners = new Set<() => void>();

const getSnapshot = (): Locale => {
  return languageStore;
};

const subscribe = (callback: () => void): () => void => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

const emitChange = () => {
  for (const listener of listeners) {
    listener();
  }
};

const setLanguageAndStorage = (lang: Locale) => {
  if (lang === languageStore) return;
  languageStore = lang;
  try {
    localStorage.setItem('curocity-lang', lang);
  } catch (e) {
    // localStorage might not be available
  }
  emitChange();
};

// Initialize the store only on the client side
if (typeof window !== 'undefined') {
  const storedLang = localStorage.getItem('curocity-lang') as Locale;
  if (storedLang && translations[storedLang]) {
    languageStore = storedLang;
  }
}
// =================================================================

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language: Locale = useSyncExternalStore(subscribe, getSnapshot, () => 'en');

  const t = useCallback((key: string): string => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage: setLanguageAndStorage,
    t,
  }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}