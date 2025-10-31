
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, type Firestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, enableIndexedDbPersistence } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getMessaging, type Messaging } from 'firebase/messaging';
import { firebaseConfig } from './config';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// --- Start of Singleton Initialization ---

// Initialize Firebase App
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const functions: Functions = getFunctions(app);

// Initialize Firestore with offline persistence, handling potential re-initialization errors.
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e: any) {
  if (e.code === 'failed-precondition') {
    console.warn("Firestore offline persistence failed to initialize. This can happen with multiple open tabs. Falling back to in-memory persistence.");
    db = getFirestore(app); // Fallback to default in-memory cache
  } else if (e.code === 'invalid-argument') {
    // This error means Firestore is already initialized, so we just get the existing instance.
    db = getFirestore(app);
  } else {
    // For other errors, we re-throw them.
    throw e;
  }
}

// Initialize Messaging only on the client-side where it's supported
let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && 'Notification' in window) {
  try {
    messaging = getMessaging(app);
  } catch (e) {
    console.warn('Firebase Messaging not supported in this environment or failed to initialize.');
  }
}

// --- End of Singleton Initialization ---

interface FirebaseContextValue {
  firebaseApp: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
  messaging: Messaging | null;
  user: User | null;
  isUserLoading: boolean;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

export function FirebaseProviderClient({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsUserLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const memoizedValue = useMemo(() => ({
    firebaseApp: app,
    auth,
    db,
    functions,
    messaging,
    user,
    isUserLoading,
  }), [user, isUserLoading]);

  return (
    <FirebaseContext.Provider value={memoizedValue}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProviderClient');
  }
  return context;
}

// Kept for backward compatibility if any component still uses it
export function useAuthContext() {
    return useFirebase();
}

export const useAuth = () => {
  const { user, isUserLoading } = useFirebase();
  return { user, isUserLoading };
};

export const useFirestore = () => {
    const { db } = useFirebase();
    return db;
};

// Main hook for accessing Firestore instance
export function useDb() {
    return useFirestore();
}

export const useFunctions = () => {
    const { functions } = useFirebase();
    return functions;
};

export const useMessaging = () => {
    const { messaging } = useFirebase();
    return messaging;
};
