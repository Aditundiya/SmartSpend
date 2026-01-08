
'use server';
/**
 * @fileOverview A Genkit flow to generate spending insights based on monthly expenses and income.
 *
 * - generateSpendingInsights - A function that calls the Genkit flow.
 * - SpendingInsightsInput - The input type for the flow.
 * - SpendingInsightsOutput - The return type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpenseInputSchema = z.object({
  categoryName: z.string().describe('The name of the spending category.'),
  amount: z.number().positive().describe('The amount spent in this category.'),
});

const SpendingInsightsInputSchema = z.object({
  expenses: z.array(ExpenseInputSchema).describe('A list of expenses for the month, with category and amount.'),
  totalIncome: z.number().min(0).describe('The total income for the month.'),
  userName: z.string().optional().describe('The name of the user for personalization.'),
});
export type SpendingInsightsInput = z.infer<typeof SpendingInsightsInputSchema>;

const SpendingInsightsOutputSchema = z.object({
  insight: z
    .string()
    .describe('A concise (2-3 sentences) and helpful insight about spending habits based on the provided data. It should be encouraging and offer a simple observation or tip if appropriate.'),
});
export type SpendingInsightsOutput = z.infer<typeof SpendingInsightsOutputSchema>;

// Exported wrapper function to be called by server components/actions
export async function generateSpendingInsights(input: SpendingInsightsInput): Promise<SpendingInsightsOutput> {
  return generateSpendingInsightsFlow(input);
}

const generateSpendingInsightsPrompt = ai.definePrompt({
  name: 'generateSpendingInsightsPrompt',
  input: {schema: SpendingInsightsInputSchema},
  output: {schema: SpendingInsightsOutputSchema},
  prompt: `
    You are a friendly financial assistant for the SmartSpend app.
    Your goal is to provide a brief, helpful, and encouraging insight into a user's spending for the month.
    {{#if userName}}The user's name is {{userName}}. Address them by their name if you can.{{/if}}

    Here is their financial data for the month:
    Total Income: \${{totalIncome}}

    Expenses:
    {{#if expenses.length}}
      {{#each expenses}}
      - {{categoryName}}: \${{amount}}
      {{/each}}
    {{else}}
      No expenses logged for this month.
    {{/if}}

    Based on this data, provide a concise (2-3 sentences) insight.
    Consider the following:
    - What was the highest spending category? (If expenses exist)
    - How does total spending compare to total income?
    - Offer a simple, positive observation or a gentle tip if spending is high in a non-essential category or if there's a good surplus.
    - If there are no expenses, acknowledge that and perhaps encourage them to start tracking.
    - If income is zero, adjust your tone appropriately.

    Keep the tone light, positive, and non-judgmental.
  `,
  config: {
    model: 'googleai/gemini-1.5-flash-latest', // Ensure model is specified
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  }
});

const generateSpendingInsightsFlow = ai.defineFlow(
  {
    name: 'generateSpendingInsightsFlow',
    inputSchema: SpendingInsightsInputSchema,
    outputSchema: SpendingInsightsOutputSchema,
  },
  async (input) => {
    // Calculate total spending from the expenses list
    const totalSpending = input.expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const result = await generateSpendingInsightsPrompt({
        ...input,
        // You could add more processed data here if needed by the prompt, e.g., totalSpending
    });

    const output = result.output;
    if (!output) {
      // Log the full response if output is undefined for debugging
      console.error('Genkit flow did not return output. Full response:', JSON.stringify(result, null, 2));
      throw new Error('No insight generated. The AI model might not have provided a valid response.');
    }
    return output;
  }
);
