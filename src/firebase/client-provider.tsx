
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, type Firestore, enableIndexedDbPersistence, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getMessaging, type Messaging } from 'firebase/messaging';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// Moved config here to keep everything in one place
export const firebaseConfig = {
  "projectId": "cabzi-welr1",
  "appId": "1:786266287419:web:4ad396cbd949ba46695b1e",
  "apiKey": "AIzaSyB8bFxF6fILR4myxGUCN9IR9Qis9ljADMA",
  "authDomain": "cabzi-welr1.firebaseapp.com",
  "storageBucket": "cabzi-welr1.appspot.com",
  "measurementId": "G-LGK753VG5R",
  "messagingSenderId": "786266287419"
};


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
  const [firebaseServices, setFirebaseServices] = useState<{
    app: FirebaseApp | null;
    auth: Auth | null;
    db: Firestore | null;
    functions: Functions | null;
    messaging: Messaging | null;
  }>({ app: null, auth: null, db: null, functions: null, messaging: null });
  
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    let app: FirebaseApp;
    if (typeof window !== 'undefined') {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        
        const auth = getAuth(app);
        const db = initializeFirestore(app, {
            localCache: memoryLocalCache(),
        });
        const functions = getFunctions(app);
        let messaging: Messaging | null = null;
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
    return db;
};

export const useFunctions = () => {
    const { functions } = useFirebase();
    return functions;
}
