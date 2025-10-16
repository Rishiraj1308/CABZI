
'use server';
/**
 * @fileoverview This file initializes the Genkit AI client.
 * This file is for demonstration purposes. In a real application, you would configure
 * plugins for different AI providers here (e.g., Google AI, Ollama for Open Router).
 */

import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';
import { firebase } from '@genkit-ai/firebase';

// Initialize and export Genkit configuration.
// Other parts of the application will import 'ai' from this file.
export const ai = genkit({
  plugins: [
    firebase(),
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  // Log all traces to the console for debugging.
  traceStore: 'firebase',
  flowStateStore: 'firebase',
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
