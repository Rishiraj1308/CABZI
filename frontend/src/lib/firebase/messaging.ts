'use client';

import { getMessaging, isSupported, type Messaging } from "firebase/messaging";
import { getFirebaseApp } from "./app";

let messagingInstance: Messaging | null | undefined = undefined;

export function getFirebaseMessaging(): Messaging | null {
  // already initialized
  if (messagingInstance !== undefined) return messagingInstance;

  // SSR safety
  if (typeof window === "undefined") {
    messagingInstance = null;
    return null;
  }

  const app = getFirebaseApp();
  if (!app) {
    messagingInstance = null;
    return null;
  }

  // DO NOT BLOCK — check support async + set later
  isSupported()
    .then((supported) => {
      if (supported && messagingInstance === null) {
        try {
          messagingInstance = getMessaging(app);
        } catch {
          messagingInstance = null;
        }
      }
    })
    .catch(() => {
      messagingInstance = null;
    });

  // Return null immediately (non-blocking)
  messagingInstance = null;
  return null;
}
