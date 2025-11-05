
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, type Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
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
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [functions, setFunctions] = useState<Functions | null>(null);
  const [messaging, setMessaging] = useState<Messaging | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [persistenceEnabled, setPersistenceEnabled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        setFirebaseApp(app);
        
        const authInstance = getAuth(app);
        setAuth(authInstance);

        const functionsInstance = getFunctions(app);
        setFunctions(functionsInstance);
        
        // Firestore setup with persistence
        if (!persistenceEnabled) {
            const dbInstance = getFirestore(app);
            enableIndexedDbPersistence(dbInstance)
              .then(() => {
                  console.log("Firestore persistence enabled.");
                  setPersistenceEnabled(true);
              })
              .catch((err) => {
                  if (err.code === 'failed-precondition') {
                      console.warn("Persistence failed: Multiple tabs open?");
                  } else if (err.code === 'unimplemented') {
                      console.warn("Persistence not available in this browser.");
                  }
              }).finally(() => {
                  // Set db instance regardless of persistence success
                  setDb(dbInstance);
              });
        }
        
        let msgInstance: Messaging | null = null;
        if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
            msgInstance = getMessaging(app);
            setMessaging(msgInstance);
        }

        const unsubscribe = onAuthStateChanged(authInstance, (user) => {
          setUser(user);
          setIsUserLoading(false);
        });

        return () => unsubscribe();
    } else {
      setIsUserLoading(false);
    }
  // This effect should only run once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memoizedValue = useMemo(() => ({
    firebaseApp,
    auth,
    db,
    functions,
    messaging,
    user,
    isUserLoading,
  }), [firebaseApp, auth, db, functions, messaging, user, isUserLoading]);

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
