"use client";

import React, { useMemo, type ReactNode } from "react";
import { firebaseApp, auth, db } from "@/firebase/config";
import { FirebaseProvider } from "@/firebase";

interface Props {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: Props) {
  // No need initializeFirebase(); Firebase already initialized inside config.ts
  const firebaseServices = useMemo(() => {
    return {
      firebaseApp,
      auth,
      firestore: db,
    };
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
