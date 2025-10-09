
'use client'

import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

// This configuration should ideally come from environment variables
const firebaseConfig = {
  "projectId": "cabzi-welr1",
  "appId": "1:786266287419:web:4ad396cbd949ba46695b1e",
  "storageBucket": "cabzi-welr1.appspot.com",
  "apiKey": "AIzaSyB8bFxF6fILR4myxGUCN9IR9Qis9ljADMA",
  "authDomain": "cabzi-welr1.firebaseapp.com",
  "measurementId": "G-LGK753VG5R",
  "messagingSenderId": "786266287419"
};

interface FirebaseServices {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
}

export function useFirebase() {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices>({ app: null, db: null, auth: null });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      const db = getFirestore(app);
      const auth = getAuth(app);
      setFirebaseServices({ app, db, auth });
    }
  }, []);

  return firebaseServices;
}
