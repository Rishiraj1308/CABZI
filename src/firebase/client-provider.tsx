

'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, type Firestore, enableIndexedDbPersistence, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getMessaging, type Messaging } from 'firebase/messaging';
import { firebaseConfig } from './config';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseContextValue {
  firebaseApp: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  functions: Functions | null;
  messaging: Messaging | null;
  user: User | null;
  isUserLoading: boolean;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

export function FirebaseProviderClient({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  
  const [firebaseServices, setFirebaseServices] = useState<{
    app: FirebaseApp | null;
    auth: Auth | null;
    db: Firestore | null;
    functions: Functions | null;
    messaging: Messaging | null;
  }>({ app: null, auth: null, db: null, functions: null, messaging: null });

  useEffect(() => {
    let app: FirebaseApp;
    let auth: Auth;
    let db: Firestore;
    let functions: Functions;
    let messaging: Messaging | null = null;
    
    if (typeof window !== 'undefined') {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        db = initializeFirestore(app, {
            localCache: memoryLocalCache(),
        });
        functions = getFunctions(app);

        if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
            messaging = getMessaging(app);
        }

        setFirebaseServices({ app, auth, db, functions, messaging });

        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
          setIsUserLoading(false);
        });

        return () => unsubscribe();
    } else {
        setIsUserLoading(false);
    }
  }, []);

  const memoizedValue = useMemo(() => ({
    firebaseApp: firebaseServices.app,
    auth: firebaseServices.auth,
    db: firebaseServices.db,
    functions: firebaseServices.functions,
    messaging: firebaseServices.messaging,
    user,
    isUserLoading,
  }), [firebaseServices, user, isUserLoading]);

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

export const useDb = () => {
    const { db } = useFirebase();
    if (!db) {
        console.warn("Firestore not initialized yet, returning null.");
    }
    return db;
};

export const useFunctions = () => {
    const { functions } = useFirebase();
    if (!functions) {
        console.warn("Functions not initialized yet, returning null.");
    }
    return functions;
}
