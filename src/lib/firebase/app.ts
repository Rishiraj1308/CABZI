
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { firebaseConfig, assertFirebaseEnv } from "./config";

let _app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (_app) return _app;
  
  // If env vars are not set, don't initialize Firebase.
  if (!assertFirebaseEnv()) {
    return null;
  }

  _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

  return _app;
}
