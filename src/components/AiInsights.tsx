
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, AlertTriangle, Info } from 'lucide-react';
import type { Expense, Profile } from '@/lib/types';
// import { generateSpendingInsights, type SpendingInsightsInput } from '@/ai/flows/generate-spending-insights';
import { CATEGORIES } from '@/data/constants';

// Mock types for static build compatibility
type SpendingInsightsInput = any;

interface AiInsightsProps {
  expenses: Expense[];
  totalIncome: number;
  currentProfile: Profile | null;
}

export default function AiInsights({ expenses, totalIncome, currentProfile }: AiInsightsProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryMap = new Map(CATEGORIES.map(cat => [cat.id, cat.name]));

  const hasExpenses = expenses.length > 0;
  const hasIncome = totalIncome > 0;
  const hasData = hasExpenses || hasIncome;

  const handleGetInsights = async () => {
    if (!hasData) return;

    setIsLoading(true);
    setError(null);
    setInsight(null);

    // Mock delay to simulate AI processing
    setTimeout(() => {
      setIsLoading(false);
      setInsight("AI Insights are currently disabled on the mobile app version. \n\nWe are working on bringing this feature to your phone soon!");
    }, 1500);

    /* 
    // SERVER ACTION DISABLED FOR STATIC EXPORT (ANDROID)
    const formattedExpenses = expenses.map(exp => ({
      categoryName: categoryMap.get(exp.categoryId) || 'Other',
      amount: exp.amount,
    }));

    const input: SpendingInsightsInput = {
      expenses: formattedExpenses,
      totalIncome: totalIncome,
      userName: currentProfile?.name,
    };

    try {
      const result = await generateSpendingInsights(input);
      setInsight(result.insight);
    } catch (err) {
      console.error('Error generating AI insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate insights. Please try again.');
    } finally {
      setIsLoading(false);
    }
    */
  };

  if (!currentProfile) {
    return null;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center">
          <Sparkles className="h-6 w-6 mr-2 text-primary" />
          AI Spending Insights for {currentProfile.name}
        </CardTitle>
        <CardDescription>
          Get a personalized summary of your spending for the current month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Sparkles className="h-5 w-5 animate-spin mr-2" />
            <p className="text-muted-foreground">Generating insights...</p>
          </div>
        )}
        {error && !isLoading && (
          <div className="text-destructive p-4 border border-destructive/50 rounded-md bg-destructive/10">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <p className="font-semibold">Error</p>
            </div>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}
        {insight && !isLoading && !error && (
          <div className="p-4 border border-border rounded-md bg-muted/50">
            <p className="text-foreground whitespace-pre-line">{insight}</p>
          </div>
        )}
        {!isLoading && !error && !insight && (
          <>
            {!hasData ? (
              <div className="flex items-center p-3 border border-dashed border-muted-foreground/50 rounded-md bg-muted/30">
                <Info className="h-5 w-5 mr-3 text-muted-foreground flex-shrink-0" />
                <p className="text-muted-foreground text-sm">
                  Add some expenses or income for this month to generate AI insights.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Click the button below to generate insights based on your current data.
              </p>
            )}
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleGetInsights}
          disabled={isLoading || !hasData}
          className="w-full"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {isLoading ? 'Generating...' : insight ? 'Regenerate Insights' : 'Get AI Insights'}
        </Button>
      </CardFooter>
    </Card>
  );
}
