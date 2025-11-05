// /lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";

export const firebaseConfig = {
  projectId: "cabzi-welr1",
  appId: "1:786266287419:web:4ad396cbd949ba46695b1e",
  apiKey: "AIzaSyB8bFxF6fILR4myxGUCN9IR9Qis9ljADMA",
  authDomain: "cabzi-welr1.firebaseapp.com",
  storageBucket: "cabzi-welr1.appspot.com",
  measurementId: "G-LGK753VG5R",
  messagingSenderId: "786266287419"
};

// ✅ Initialize app ONCE — server or client both safe.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// ✅ Initialize services safely (they don't run queries)
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// ✅ Persistence only in browser + only once
if (typeof window !== "undefined") {
  enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Persistence error:", err.code, err.message);
  });
}

let messaging = null;
if (typeof window !== "undefined") {
  try {
    const { getMessaging } = require("firebase/messaging");
    messaging = getMessaging(app);
  } catch (e) {
    console.warn("Messaging load error:", e);
  }
}

export { app, auth, db, functions, messaging };
