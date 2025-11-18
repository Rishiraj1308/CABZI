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
let messaging: Messaging | null = null;

// Only run this on client (browser)
if (typeof window !== 'undefined' && app) {
  try {
    messaging = getFirebaseMessaging(); // MUST NOT return Promise
  } catch (err) {
    console.warn('Messaging init failed:', err);
    messaging = null;
  }
}

export { app, auth, db, functions, messaging };
