
'use server';
/**
 * @fileOverview An AI flow that provides personalized earnings tips for drivers.
 * 
 * - getEarningsTip - A function that returns a personalized tip.
 * - EarningsTipInput - The input type for the flow.
 * - EarningsTipOutput - The output type for the flow.
 */

import { ai } from '@/ai/genkit-client';
import { z } from 'genkit/zod';

export const EarningsTipInputSchema = z.object({
    ridesToday: z.number().describe("Number of rides completed today"),
    currentEarnings: z.number().describe("Total earnings for the day so far"),
    currentZone: z.string().describe("The driver's current location or zone"),
});
export type EarningsTipInput = z.infer<typeof EarningsTipInputSchema>;

export const EarningsTipOutputSchema = z.object({
    tip: z.string().describe("A short, actionable, and encouraging tip for the driver to increase their earnings."),
});
export type EarningsTipOutput = z.infer<typeof EarningsTipOutputSchema>;


const earningsPrompt = ai.definePrompt({
    name: 'earningsCoachPrompt',
    input: { schema: EarningsTipInputSchema },
    output: { schema: EarningsTipOutputSchema },
    prompt: `You are an encouraging and helpful AI coach for a ride-hailing app driver in India.
    Your goal is to provide a short, actionable, and location-specific tip to help them increase their earnings.
    Keep the tone positive and motivational. Address the driver directly.

    Driver's Data:
    - Rides Today: {{ridesToday}}
    - Today's Earnings: ₹{{currentEarnings}}
    - Current Zone: {{currentZone}}

    Based on this data, provide one single, concise tip. Examples:
    - "Great start to the day! Consider moving towards the airport area, demand is high there now."
    - "You're doing well! The evening rush is about to start near office parks. Good earnings potential there."
    - "Fantastic work today! A couple more rides will get you to a new milestone. Let's go!"

    Generate a new, relevant tip for the driver.`,
});

const earningsCoachFlow = ai.defineFlow(
    {
        name: 'earningsCoachFlow',
        inputSchema: EarningsTipInputSchema,
        outputSchema: EarningsTipOutputSchema,
    },
    async (input) => {
        const { output } = await earningsPrompt(input);
        return output!;
    }
);

export async function getEarningsTip(input: EarningsTipInput): Promise<EarningsTipOutput> {
    return earningsCoachFlow(input);
}
