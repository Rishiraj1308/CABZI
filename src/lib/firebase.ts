
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { getMessaging, type Messaging } from 'firebase/messaging';

// Your web app's Firebase configuration
export const firebaseConfig = {
  "projectId": "cabzi-welr1",
  "appId": "1:786266287419:web:4ad396cbd949ba46695b1e",
  "apiKey": "AIzaSyB8bFxF6fILR4myxGUCN9IR9Qis9ljADMA",
  "authDomain": "cabzi-welr1.firebaseapp.com",
  "storageBucket": "cabzi-welr1.appspot.com",
  "measurementId": "G-LGK753VG5R",
  "messagingSenderId": "786266287419"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let messaging: Messaging | null = null;

if (typeof window !== 'undefined') {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);

  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Firestore persistence failed: Multiple tabs open?");
    } else if (err.code === 'unimplemented') {
      console.warn("Firestore persistence not supported in this browser.");
    }
  });

  if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
    messaging = getMessaging(app);
  }
} else {
  // To avoid errors during server-side rendering
  // @ts-ignore
  app = null;
  // @ts-ignore
  auth = null;
  // @ts-ignore
  db = null;
  // @ts-ignore
  functions = null;
}

export { app, auth, db, functions, messaging };
