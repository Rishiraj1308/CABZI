
'use server';
/**
 * @fileOverview An AI agent that provides personalized earnings advice to drivers.
 * - getEarningsTip: A function that generates a tip based on driver stats.
 * - DriverStatsInput: The input type for the function.
 * - DriverTipOutput: The return type for the function.
 */

import {ai} from '@/ai/genkit-client';
import {z} from 'zod';
import {
  DriverStatsInputSchema,
  type DriverStatsInput,
  DriverTipOutputSchema,
  type DriverTipOutput,
} from '@/ai/schemas/earnings-coach';

// Re-export types for client-side usage
export type {DriverStatsInput, DriverTipOutput};

export async function getEarningsTip(
  input: DriverStatsInput
): Promise<DriverTipOutput> {
  return earningsCoachFlow(input);
}

const earningsCoachPrompt = ai.definePrompt(
  {
    name: 'earningsCoachPrompt',
    input: {
      schema: DriverStatsInputSchema,
    },
    output: {
      schema: DriverTipOutputSchema,
    },
    prompt: `You are an expert earnings coach for a ride-hailing app in India called Cabzi.
Your goal is to give a single, actionable, and encouraging tip to a driver based on their performance.
The language should be simple, like talking to a friend.

Here are the driver's stats:
- Rides Today: {{{ridesToday}}}
- Acceptance Rate: {{{acceptanceRate}}}%
- Rating: {{{rating}}} out of 5
- Subscription Tier: {{{subscriptionTier}}}

Based on these stats, provide one single, encouraging, and actionable tip to help them earn more or improve their performance.
Focus on the most important area for improvement or encouragement.

Examples:
- If rating is low: "Your rating is a bit low. Try offering a mint to passengers. Small things make a big difference!"
- If rides are low on a weekday: "It's a weekday, try driving during evening peak hours (5 PM - 8 PM) near office areas to get more rides."
- If acceptance rate is low: "Try to accept more rides. A higher acceptance rate can lead to better incentives in the Pro plan."

Generate a tip for the given driver stats.
`,
  },
);

const earningsCoachFlow = ai.defineFlow(
  {
    name: 'earningsCoachFlow',
    inputSchema: DriverStatsInputSchema,
    outputSchema: DriverTipOutputSchema,
  },
  async (input) => {
    const {output} = await earningsCoachPrompt(input);
    return output!;
  }
);
