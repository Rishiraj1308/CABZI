
/**
 * @fileoverview This file initializes the Genkit AI client.
 * This file is for demonstration purposes. In a real application, you would configure
 * plugins for different AI providers here (e.g., Google AI, Ollama for Open Router).
 */

import { genkit, type GenkitOptions } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { firebase as firebasePlugin } from '@genkit-ai/firebase';

// Initialize Genkit with the Google AI plugin.
const genkitOptions: GenkitOptions = {
  plugins: [
    firebasePlugin(),
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
};

export const ai = genkit(genkitOptions);
