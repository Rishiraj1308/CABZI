'use client';

import React, { useMemo, type ReactNode } from "react";
import { initializeFirebase } from "@/lib/firebase";
import { FirebaseProvider } from "@/lib/firebase/provider";

interface Props {
  children: ReactNode;
}

export default function FirebaseClientProvider({ children }: Props) {
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
