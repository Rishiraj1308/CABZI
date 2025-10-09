
'use client'

import { createContext, useContext, useEffect, useState } from 'react';
import { type FirebaseApp } from 'firebase/app';
import { type Auth, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { type Firestore } from 'firebase/firestore';
import { app, db as firestoreDb, auth as firebaseAuth } from '@/lib/firebase';

interface FirebaseContextType {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  user: FirebaseUser | null;
  isLoading: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firebaseAuth) {
        setIsLoading(false);
        return;
    }
    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <FirebaseContext.Provider value={{ app, db: firestoreDb, auth: firebaseAuth, user, isLoading }}>
      {children}
    </FirebaseContext.Provider>
  );
}

// Custom hooks to easily access Firebase services
export const useFirebaseApp = () => {
    const context = useContext(FirebaseContext);
    if (!context) throw new Error("useFirebaseApp must be used within a FirebaseClientProvider");
    return context.app;
}

export const useFirestore = () => {
    const context = useContext(FirebaseContext);
    if (!context) throw new Error("useFirestore must be used within a FirebaseClientProvider");
    return context.db;
}

export const useAuthContext = () => {
    const context = useContext(FirebaseContext);
    if (!context) throw new Error("useAuthContext must be used within a FirebaseClientProvider");
    return context;
};
