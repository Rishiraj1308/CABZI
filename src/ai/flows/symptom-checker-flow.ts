
'use server';
/**
 * @fileOverview An AI flow to analyze user-described symptoms and suggest a medical specialization.
 *
 * - suggestSpecialization - A function that handles the symptom analysis.
 * - SymptomCheckerInput - The input type for the suggestSpecialization function.
 * - SymptomCheckerOutput - The return type for the suggestSpecialization function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SymptomCheckerInputSchema = z.object({
  symptoms: z.string().describe('A plain text description of the user\'s medical symptoms.'),
});
export type SymptomCheckerInput = z.infer<typeof SymptomCheckerInputSchema>;

const SymptomCheckerOutputSchema = z.object({
  specialization: z.string().describe('The single, most relevant medical specialization to consult for the given symptoms. e.g., "Cardiology", "Orthopedics", "General Physician".'),
});
export type SymptomCheckerOutput = z.infer<typeof SymptomCheckerOutputSchema>;

export async function suggestSpecialization(input: SymptomCheckerInput): Promise<SymptomCheckerOutput> {
  return symptomCheckerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'symptomCheckerPrompt',
  input: { schema: SymptomCheckerInputSchema },
  output: { schema: SymptomCheckerOutputSchema },
  prompt: `You are an expert medical triage AI. Your role is to analyze a user's description of their symptoms and recommend the single most appropriate medical specialization they should consult.

User's Symptoms:
"{{{symptoms}}}"

Based on these symptoms, determine the most relevant medical field from the following list: Cardiology, Neurology, Orthopedics, Pediatrics, Oncology, Gastroenterology, General Physician, Dermatology, ENT Specialist.

Return only the name of the specialization. For general or unclear symptoms, default to "General Physician".
`,
});

const symptomCheckerFlow = ai.defineFlow(
  {
    name: 'symptomCheckerFlow',
    inputSchema: SymptomCheckerInputSchema,
    outputSchema: SymptomCheckerOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
