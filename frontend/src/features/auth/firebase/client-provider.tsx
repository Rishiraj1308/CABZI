
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react';

import { onAuthStateChanged, type User } from 'firebase/auth';

// ✅ Import from the new, consolidated entry point
import { app, auth, db, functions, messaging as getMessagingPromise } from '@/lib/firebase';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import type { Messaging } from 'firebase/messaging';


import { FirebaseErrorListener } from '@/components/shared/FirebaseErrorListener';

interface FirebaseContextValue {
  firebaseApp: FirebaseApp | null; // Allow null
  auth: Auth | null; // Allow null
  db: Firestore | null; // Allow null
  functions: Functions | null; // Allow null
  messaging: Messaging | null;
  user: User | null;
  isUserLoading: boolean;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(
  undefined
);

export function FirebaseProviderClient({ children }: { children: ReactNode }) {
  const [messaging, setMessaging] = useState<Messaging | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    if (getMessagingPromise) {
      getMessagingPromise.then((m) => setMessaging(m));
    }
  }, []);

  useEffect(() => {
    if (!auth) {
        setIsUserLoading(false);
        return;
    };
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      setIsUserLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      firebaseApp: app,
      auth,
      db,
      functions,
      messaging,
      user,
      isUserLoading,
    }),
    [user, isUserLoading, messaging, functions]
  );

  return (
    <FirebaseContext.Provider value={value}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used inside FirebaseProviderClient');
  }
  return context;
}

export const useDb = () => useFirebase().db;
export const useFunctions = () => useFirebase().functions;
