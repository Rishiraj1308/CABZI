
'use server';
/**
 * @fileOverview An AI agent for handling initial customer support chats.
 * - handleSupportChat: A function that generates an initial response and logs a ticket.
 */

import {ai} from '@/ai/genkit-client';
import {z} from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import {initializeApp, getApps} from 'firebase-admin/app';

if (!getApps().length) {
    initializeApp();
}
const db = getFirestore();


const SupportChatInputSchema = z.object({
  query: z.string().describe('The user\'s support question.'),
  userName: z.string().describe('The name of the user.'),
  userPhone: z.string().describe('The phone number of the user.'),
  userType: z.enum(['rider', 'partner']).describe('The type of user.'),
});
export type SupportChatInput = z.infer<typeof SupportChatInputSchema>;

const SupportChatOutputSchema = z.object({
  initialResponse: z
    .string()
    .describe(
      'A helpful, empathetic initial response to the user\'s query. Try to answer the question directly. End by asking if the solution was helpful and mentioning that a ticket has been logged.'
    ),
  ticketId: z.string().describe('The unique ID generated for the support ticket.'),
});
export type SupportChatOutput = z.infer<typeof SupportChatOutputSchema>;


// This is the main function that the client will call.
export async function handleSupportChat(
  input: SupportChatInput
): Promise<SupportChatOutput> {
  return supportChatFlow(input);
}

const supportChatPrompt = ai.definePrompt({
  name: 'supportChatPrompt',
  input: {
    schema: SupportChatInputSchema,
  },
  output: {
    schema: SupportChatOutputSchema,
  },
  prompt: `You are an AI support agent for a ride-hailing app called Cabzi.
A user named {{{userName}}} has a support query.

Your tasks are:
1.  Analyze the user's query: "{{{query}}}"
2.  Provide a helpful and direct initial response. If you can answer the query, do so.
3.  Use the provided ticket ID: {{{ticketId}}}.
4.  Your response MUST end by asking if the solution was helpful and informing them that a ticket has been logged with the generated ID for their reference, in case they need to speak to a human agent.

Example query: "My payment failed but money was debited"
Example response: "I understand your concern. Usually, if a payment fails, the amount is automatically refunded by your bank within 5-7 working days. Please check your bank statement after a few days. For your reference, I have logged a ticket for this issue with ID: TKT-R-1692581. Was this information helpful, or would you like to speak to a human agent?"

Now, generate a response for the user's query.`,
});

const supportChatFlow = ai.defineFlow(
  {
    name: 'supportChatFlow',
    inputSchema: SupportChatInputSchema,
    outputSchema: SupportChatOutputSchema,
  },
  async (input) => {
    // Step 1: Log the ticket in Firestore immediately.
    const ticketId = `TKT-${input.userType === 'rider' ? 'R' : 'P'}-${Date.now()}`;
    const queryData = {
        ticketId,
        customerName: input.userName,
        customerPhone: input.userPhone,
        userType: input.userType,
        query: input.query,
        status: 'Pending', // Initially pending, can be 'Resolved by AI' later
        createdAt: new Date(), // Use standard Date for admin sdk
    };

    if (db) {
      try {
        await db.collection('supportQueries').add(queryData);
      } catch (e) {
        console.error('Failed to log support ticket:', e);
        // Even if logging fails, we should still try to help the user.
      }
    }

    // Step 2: Generate the helpful AI response.
    // We pass the generated ticketId to the prompt context.
    const {output} = await supportChatPrompt({...input, ticketId});
    
    return {
        initialResponse: output!.initialResponse,
        ticketId: ticketId,
    };
  }
);
