
'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, type Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
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
  const [services, setServices] = useState<{
    firebaseApp: FirebaseApp | null;
    auth: Auth | null;
    db: Firestore | null;
    functions: Functions | null;
    messaging: Messaging | null;
  }>({
    firebaseApp: null,
    auth: null,
    db: null,
    functions: null,
    messaging: null,
  });

  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  const setupFirebase = useCallback(async () => {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const authInstance = getAuth(app);
    const dbInstance = getFirestore(app);
    const functionsInstance = getFunctions(app);

    try {
        await enableIndexedDbPersistence(dbInstance);
    } catch (err: any) {
        if (err.code === 'failed-precondition') {
            console.warn('Firestore Persistence could not be enabled: Multiple tabs open?');
        } else if (err.code === 'unimplemented') {
            console.warn('Firestore Persistence could not be enabled: Browser does not support it.');
        }
    }
    
    let messagingInstance: Messaging | null = null;
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        messagingInstance = getMessaging(app);
      } catch (e) {
        console.warn('Firebase Messaging not supported in this environment.');
      }
    }
    
    return {
        firebaseApp: app,
        auth: authInstance,
        db: dbInstance,
        functions: functionsInstance,
        messaging: messagingInstance,
    }
  }, []);

  useEffect(() => {
    
    setupFirebase().then(firebaseServices => {
        setServices(firebaseServices);
        
        const unsubscribe = onAuthStateChanged(firebaseServices.auth, (user) => {
          setUser(user);
          setIsUserLoading(false);
        });

        return () => unsubscribe();
    });

  }, [setupFirebase]);

  const memoizedValue = useMemo(() => ({
    ...services,
    user,
    isUserLoading,
  }), [services, user, isUserLoading]);

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
