
/**
 * @fileoverview This file initializes the Genkit AI client.
 * This file is for demonstration purposes. In a real application, you would configure
 * plugins for different AI providers here (e.g., Google AI, Ollama for Open Router).
 */

import { genkit, configureGenkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { firebase } from '@genkit-ai/firebase/server';


// Initialize Genkit with the Google AI plugin.
export const ai = genkit({
  plugins: [
    firebase(),
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  // Log all traces to the console for debugging.
  // In production, you would want to use a persistent trace store.
});

configureGenkit({
    flowStateStore: 'firebase',
    traceStore: 'firebase',
});

    