// src/lib/firebase.ts

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getFunctions, type Functions } from 'firebase/functions';
import { getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  "projectId": "cabzi-welr1",
  "appId": "1:786266287419:web:4ad396cbd949ba46695b1e",
  "storageBucket": "cabzi-welr1.appspot.com",
  "apiKey": "AIzaSyB8bFxF6fILR4myxGUCN9IR9Qis9ljADMA",
  "authDomain": "cabzi-welr1.firebaseapp.com",
  "measurementId": "G-LGK753VG5R",
  "messagingSenderId": "786266287419"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let functions: Functions;
let messaging: Messaging | null = null;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);
functions = getFunctions(app);

if (typeof window !== 'undefined') {
  messaging = getMessaging(app);
}

// @ts-ignore
export { app, auth, db, functions, messaging, getMessaging };
