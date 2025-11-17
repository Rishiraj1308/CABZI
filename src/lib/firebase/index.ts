
// This file is the single source of truth for Firebase client-side services.
// It ensures that only one instance of each service is created and used throughout the app.

import { getFirebaseApp } from './app';
import { getFirebaseAuth } from './auth';
import { getDb } from './firestore';
import { getFirebaseFunctions } from './functions';
import { getFirebaseMessaging } from './messaging';

const app = getFirebaseApp();
// Initialize other services only if the app was successfully initialized
const auth = app ? getFirebaseAuth() : null;
const db = app ? getDb() : null;
const functions = app ? getFirebaseFunctions() : null;
const messaging = app ? getFirebaseMessaging() : null;


export { app, auth, db, functions, messaging };
