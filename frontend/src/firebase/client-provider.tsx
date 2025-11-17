
'use client';

import React, { useMemo, type ReactNode } from "react";
import { initializeFirebase } from "@/firebase"; // Corrected: Use the central initializer
import { FirebaseProvider } from "@/firebase/provider"; // Corrected: Import from the correct provider file

interface Props {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: Props) {
  // Initialize Firebase and get SDKs. useMemo ensures this only runs once.
  const firebaseServices = useMemo(() => initializeFirebase(), []);

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
