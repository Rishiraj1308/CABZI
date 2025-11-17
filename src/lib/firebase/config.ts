
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export function assertFirebaseEnv() {
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    console.warn(
      `
      --------------------------------------------------
      WARNING: Missing Firebase Environment Variables!
      --------------------------------------------------
      The following Firebase environment keys are not set:
      - ${missing.join("\n- ")}

      Firebase features will not work until you add these to your .env file
      and restart the development server.

      See .env.example for a template.
      --------------------------------------------------
      `
    );
    return false; // Indicates that env vars are missing
  }
  return true; // Indicates that env vars are present
}
