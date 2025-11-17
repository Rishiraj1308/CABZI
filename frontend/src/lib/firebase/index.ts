// This file is the single source of truth for Firebase client-side services.
// It ensures that only one instance of each service is created and used throughout the app.

import { getFirebaseApp } from './app';
import { getFirebaseAuth } from './auth';
import { getDb } from './firestore';
import { getFirebaseFunctions } from './functions';
import { getFirebaseMessaging } from './messaging';

const app = getFirebaseApp();
const auth = getFirebaseAuth();
const db = getDb();
const functions = getFirebaseFunctions();
const messaging = getFirebaseMessaging();

export { app, auth, db, functions, messaging };
