import { genkit } from '@genkit-ai/core';
import { firebase } from '@genkit-ai/firebase';
import { googleAI } from '@genkit-ai/google-genai';
import { defineSecret } from 'firebase-functions/params';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

export const ai = genkit({
  plugins: [
    firebase(),
    googleAI({
      apiKey: geminiApiKey,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
