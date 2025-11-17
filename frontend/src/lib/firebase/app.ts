import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { firebaseConfig, assertFirebaseEnv } from "./config";

let _app: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;

  assertFirebaseEnv();
  _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

  return _app;
}
