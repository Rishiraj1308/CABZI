
'use client';

import { getFirebaseApp } from './app';
import { getFirebaseAuth } from './auth';
import { getDb } from './firestore';
import { getFirebaseFunctions } from './functions';
import { getFirebaseMessaging } from './messaging';

import type { Messaging } from 'firebase/messaging';

// Initialize app (safe on client)
const app = getFirebaseApp();

// Safe service initialization
const auth = app ? getFirebaseAuth() : null;
const db = app ? getDb() : null;
const functions = app ? getFirebaseFunctions() : null;

// --- FIXED MESSAGING HANDLING ---
let messaging: Promise<Messaging | null> | null = null;

// Only run this on client (browser)
if (typeof window !== 'undefined' && app) {
  messaging = getFirebaseMessaging();
}

// Re-export hooks from client-provider
export * from './client-provider';

export { app, auth, db, functions, messaging };
