
// src/lib/firebase/firestore.ts
import {
    initializeFirestore,
    memoryLocalCache,
    persistentLocalCache,
    persistentSingleTabManager,
    type Firestore
  } from "firebase/firestore";
  import { getFirebaseApp } from "./app";
  
  let _firestore: Firestore | null = null;
  
  export function getDb(): Firestore | null {
    if (_firestore) return _firestore;
  
    const app = getFirebaseApp();
    if (!app) return null;
  
    try {
      _firestore = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentSingleTabManager(),
        }),
      });
    } catch (error) {
      console.warn("⚠️ Firestore persistence failed, using memory cache instead.");
      _firestore = initializeFirestore(app, {
        localCache: memoryLocalCache(),
      });
    }
  
    return _firestore;
  }
