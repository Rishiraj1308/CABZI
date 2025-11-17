'use client';

import { useEffect, useState } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import type { Messaging } from 'firebase/messaging';

// Defines the structure for the Firebase services object
interface FirebaseServices {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  functions: Functions | null;
  messaging: Messaging | null;
  isReady: boolean;
}

/**
 * A client-side hook to initialize Firebase services safely.
 * It uses dynamic imports within a useEffect to ensure all code
 * only runs on the client, preventing SSR errors.
 */
export function useFirebaseClient(): FirebaseServices {
  const [services, setServices] = useState<FirebaseServices>({
    app: null,
    auth: null,
    db: null,
    functions: null,
    messaging: null,
    isReady: false,
  });

  useEffect(() => {
    const initializeFirebase = async () => {
      // Use Promise.all to correctly and concurrently handle dynamic imports.
      const [
        appModule,
        authModule,
        firestoreModule,
        functionsModule,
        messagingModule,
      ] = await Promise.all([
        import('./app'),
        import('./auth'),
        import('./firestore'),
        import('./functions'),
        import('./messaging'),
      ]);

      const app = appModule.getFirebaseApp();
      if (app) {
        const auth = authModule.getFirebaseAuth();
        const db = firestoreModule.getDb();
        const functions = functionsModule.getFirebaseFunctions();
        const messaging = await messagingModule.getFirebaseMessaging();

        setServices({ app, auth, db, functions, messaging, isReady: true });
      }
    };

    // Ensure initialization runs only once.
    if (!services.isReady) {
      initializeFirebase();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array is correct here to run once.

  return services;
}
