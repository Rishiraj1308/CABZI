
'use client';

import { getMessaging, isSupported, type Messaging } from "firebase/messaging";
import { getFirebaseApp } from "./app";

let messagingPromise: Promise<Messaging | null> | null = null;

export function getFirebaseMessaging(): Promise<Messaging | null> {
  // If we've already started the process, return the existing promise
  if (messagingPromise) {
    return messagingPromise;
  }

  // Create a new promise to handle the async initialization
  messagingPromise = new Promise(async (resolve) => {
    // SSR safety
    if (typeof window === "undefined") {
      return resolve(null);
    }
    
    const app = getFirebaseApp();
    if (!app) {
      return resolve(null);
    }

    try {
      const supported = await isSupported();
      if (supported) {
        resolve(getMessaging(app));
      } else {
        console.warn("Firebase Messaging is not supported in this browser.");
        resolve(null);
      }
    } catch (error) {
      console.error("Error initializing Firebase Messaging:", error);
      resolve(null);
    }
  });

  return messagingPromise;
}
