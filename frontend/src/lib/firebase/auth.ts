import { getAuth, browserLocalPersistence, setPersistence, Auth } from "firebase/auth";
import { getFirebaseApp } from "./app";

let _auth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;

  const app = getFirebaseApp();
  _auth = getAuth(app);

  // Set persistence to local so the user stays logged in.
  // This is a one-time setup.
  if (typeof window !== "undefined") {
    setPersistence(_auth, browserLocalPersistence)
      .catch((error) => {
        console.error("Error setting auth persistence:", error);
      });
  }

  return _auth;
}
