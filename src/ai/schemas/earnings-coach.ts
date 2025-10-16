
/**
 * @fileoverview Defines the Zod schemas for the earnings coach AI agent.
 */

import {z} from 'zod';

export const DriverStatsInputSchema = z.object({
  ridesToday: z.number().describe("The number of rides the driver has completed today."),
  acceptanceRate: z.number().describe("The driver's ride acceptance rate as a percentage."),
  rating: z.number().describe("The driver's overall rating out of 5."),
  subscriptionTier: z.string().describe("The driver's current subscription plan (e.g., Free Trial, Pro)."),
});

export type DriverStatsInput = z.infer<typeof DriverStatsInputSchema>;


export const DriverTipOutputSchema = z.object({
  tip: z.string().describe("A single, actionable, and encouraging tip for the driver in simple language. The tip should be concise and directly helpful."),
});

export type DriverTipOutput = z.infer<typeof DriverTipOutputSchema>;
