
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Expense, Income, SpendingByCategory, Profile } from '@/lib/types';
import type { IncomeFormValues } from '@/lib/validations';
import AppHeader from '@/components/AppHeader';
import MobileNavigation from '@/components/MobileNavigation';
import QuickExpenseEntry from '@/components/QuickExpenseEntry';
import SummaryCards from '@/components/SummaryCards';
import SpendingChart from '@/components/SpendingChart';
import ExpenseForm from '@/components/ExpenseForm';
import type { ExpenseFormValues as ExpenseFormValuesType } from '@/lib/validations';
import IncomeForm from '@/components/IncomeForm';
import { CATEGORIES, CATEGORY_COLORS, RECURRING_INCOMES_CONFIG, INCOME_FREQUENCIES_CONFIG, PERSONS } from '@/data/constants';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getExpenses, addExpenseFS, getIncomes, addIncomeFS } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, PlusCircle, TrendingDown, TrendingUp, Percent } from 'lucide-react';
import { addMonths, subMonths, format, startOfMonth, isSameMonth } from 'date-fns';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/hooks/use-currency';
import AiInsights from '@/components/AiInsights';
import ProtectedRoute from '@/components/ProtectedRoute';
import RecurringExpenseManager from '@/components/RecurringExpenseManager';



const calculateRecurringIncomesForMonth = (profileId: string, year: number, month: number): number => {
  let totalRecurring = 0;
  const profileRecurringEntries = RECURRING_INCOMES_CONFIG.filter(entry => entry.profileId === profileId);

  profileRecurringEntries.forEach(entry => {
    const frequencyConfig = INCOME_FREQUENCIES_CONFIG.find(f => f.id === entry.frequencyId);
    if (frequencyConfig) {
      totalRecurring += entry.amount * frequencyConfig.occurrencesPerMonth;
    }
  });
  return totalRecurring;
};


function DashboardContent() {
  const { currentProfile, loading: profileLoading } = useProfile();
  const { user } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [manuallyLoggedincomes, setManuallyLoggedincomes] = useState<Income[]>([]);
  const [calculatedRecurringIncome, setCalculatedRecurringIncome] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [viewingDate, setViewingDate] = useState(new Date());
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { toast } = useToast();

  // Check if viewing another user's profile (read-only mode)
  // For now, if currentProfile.id isn't the user's UID, it's read-only.
  const isReadOnlyMode = useMemo(() => {
    if (!user || !currentProfile) return true;
    const isOwner = currentProfile.id === user.uid;
    const isPartnerOfThisProfile = currentProfile.partnerUid === user.uid;
    return !isOwner && !isPartnerOfThisProfile;
  }, [user, currentProfile]);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    if (profileLoading || !currentProfile) {
      setExpenses([]);
      setManuallyLoggedincomes([]);
      setCalculatedRecurringIncome(0);
      setIsLoadingData(!currentProfile);
      return;
    }

    const loadPageData = async () => {
      setIsLoadingData(true);
      try {
        const year = viewingDate.getFullYear();
        const month = viewingDate.getMonth();

        // Generate any pending recurring income records first
        try {
          const { generateAllPendingIncomeRecords } = await import('@/lib/recurring-income');
          console.log('🔄 Checking for pending recurring income records...');
          await generateAllPendingIncomeRecords(currentProfile.id);
          console.log('✅ Recurring income check completed');
        } catch (recurringError) {
          console.error('❌ Error generating recurring income records:', recurringError);
          // Don't fail the whole load if recurring income generation fails
        }

        // Generate any pending recurring expense records
        try {
          const { generateAllPendingExpenseRecords } = await import('@/lib/recurring-expense');
          console.log('🔄 Checking for pending recurring expense records...');
          await generateAllPendingExpenseRecords(currentProfile.id);
          console.log('✅ Recurring expense check completed');
        } catch (recurringError) {
          console.error('Error generating recurring expenses:', recurringError);
        }

        const [fetchedExpenses, fetchedManualIncomes] = await Promise.all([
          getExpenses(currentProfile.id, year, month),
          getIncomes(currentProfile.id, year, month)
        ]);

        setExpenses(fetchedExpenses);
        setManuallyLoggedincomes(fetchedManualIncomes);

        const recurring = calculateRecurringIncomesForMonth(currentProfile.id, year, month);
        setCalculatedRecurringIncome(recurring);

      } catch (error) {
        console.error("Error loading data from Firestore:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Data",
          description: "Could not fetch financial data. Please try again or check console.",
        });
        setExpenses([]);
        setManuallyLoggedincomes([]);
        setCalculatedRecurringIncome(0);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadPageData();
  }, [currentProfile, viewingDate, toast, profileLoading]);


  const handleAddExpense = async (formData: ExpenseFormValuesType) => {
    if (!currentProfile) return;

    const expenseToAdd: Omit<Expense, 'id'> = {
      description: formData.description,
      amount: formData.amount,
      categoryId: formData.categoryId,
      date: formData.date,
      profileId: formData.profileId,
    };
    setIsLoadingData(true);
    try {
      // Check if this is a recurring expense
      if (formData.frequency && formData.frequency !== 'one-time') {
        const { addRecurringExpenseTemplate, generateExpenseRecordsForTemplate, getRecurringExpenseTemplates } =
          await import('@/lib/recurring-expense');

        const templateId = addRecurringExpenseTemplate(
          formData.profileId,
          formData.description,
          formData.amount,
          formData.categoryId,
          formData.frequency,
          formData.date
        );

        const templates = getRecurringExpenseTemplates();
        const template = templates.find(t => t.id === templateId);
        if (template) {
          const futureDate = new Date();
          futureDate.setFullYear(futureDate.getFullYear() + 1);
          await generateExpenseRecordsForTemplate(template, futureDate);
        }

        toast({
          title: "Recurring Expense Set Up",
          description: `${formData.description} of ${formatCurrency(formData.amount)} will be automatically added ${formData.frequency}.`,
          className: "bg-accent text-accent-foreground"
        });
      } else {
        await addExpenseFS(formData.profileId, expenseToAdd);
        toast({
          title: "Expense Added",
          description: `${formData.description} for ${formatCurrency(formData.amount)} has been successfully added.`,
          className: "bg-accent text-accent-foreground"
        });
      }

      if (formData.profileId === currentProfile.id && isSameMonth(formData.date, viewingDate)) {
        const fetchedExpenses = await getExpenses(currentProfile.id, viewingDate.getFullYear(), viewingDate.getMonth());
        setExpenses(fetchedExpenses);
      }
    } catch (error) {
      console.error("Error adding expense:", error);
      toast({
        variant: "destructive",
        title: "Error Adding Expense",
        description: "Could not save expense. Please try again.",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleAddManualIncome = async (newIncomeDataWithProfileId: Omit<Income, 'id'>) => {
    if (!currentProfile) return;
    setIsLoadingData(true);
    try {
      // Check if this is a recurring income
      if (newIncomeDataWithProfileId.frequency && newIncomeDataWithProfileId.frequency !== 'one-time') {
        // Import the recurring income functions
        const { addRecurringIncomeTemplate, generateIncomeRecordsForTemplate, getRecurringIncomeTemplates } = await import('@/lib/recurring-income');

        // Create a recurring income template
        const templateId = addRecurringIncomeTemplate(
          currentProfile.id,
          newIncomeDataWithProfileId.description,
          newIncomeDataWithProfileId.amount,
          newIncomeDataWithProfileId.frequency,
          newIncomeDataWithProfileId.date
        );

        // Generate income records for the next 12 months
        const templates = getRecurringIncomeTemplates();
        const template = templates.find(t => t.id === templateId);
        if (template) {
          const futureDate = new Date();
          futureDate.setFullYear(futureDate.getFullYear() + 1); // Generate for next 12 months
          await generateIncomeRecordsForTemplate(template, futureDate);
        }

        toast({
          title: "Recurring Income Set Up",
          description: `${newIncomeDataWithProfileId.description} of ${formatCurrency(newIncomeDataWithProfileId.amount)} will be automatically added ${newIncomeDataWithProfileId.frequency}.`,
          className: "bg-accent text-accent-foreground"
        });
      } else {
        // Handle one-time income as before
        await addIncomeFS(newIncomeDataWithProfileId.profileId, newIncomeDataWithProfileId);
        toast({
          title: "Income Added",
          description: `${newIncomeDataWithProfileId.description} of ${formatCurrency(newIncomeDataWithProfileId.amount)} has been successfully added.`,
          className: "bg-accent text-accent-foreground"
        });
      }

      // Refresh the income data for current month
      if (isSameMonth(newIncomeDataWithProfileId.date, viewingDate)) {
        const fetchedIncomes = await getIncomes(currentProfile.id, viewingDate.getFullYear(), viewingDate.getMonth());
        setManuallyLoggedincomes(fetchedIncomes);
      }
    } catch (error) {
      console.error("Error adding income:", error);
      toast({
        variant: "destructive",
        title: "Error Adding Income",
        description: "Could not save income. Please try again.",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleAddIncomeFormSubmitWrapped = async (formData: IncomeFormValues) => {
    if (!currentProfile) return;
    const incomeDataWithProfile: Omit<Income, 'id'> = {
      ...formData,
      profileId: user?.uid || currentProfile.id,
      date: formData.date instanceof Date ? formData.date : new Date(formData.date)
    };
    await handleAddManualIncome(incomeDataWithProfile);
  };


  const spendingByCategory = useMemo<SpendingByCategory[]>(() => {
    return CATEGORIES.map(category => {
      const categoryExpenses = expenses.filter(e => e.categoryId === category.id);
      const totalSpent = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
      const color = (CATEGORY_COLORS as Record<string, string>)[category.id] || 'hsl(var(--muted-foreground))';

      return {
        name: category.name,
        total: totalSpent,
        fill: color,
      };
    }).filter(item => item.total > 0);
  }, [expenses]);

  const handlePreviousMonth = () => {
    setViewingDate(prev => subMonths(startOfMonth(prev), 1));
  };

  const handleNextMonth = () => {
    setViewingDate(prev => addMonths(startOfMonth(prev), 1));
  };

  const totalManuallyLoggedIncome = manuallyLoggedincomes.reduce((sum, income) => sum + income.amount, 0);
  const totalIncomeForMonth = totalManuallyLoggedIncome + calculatedRecurringIncome;
  const totalSpending = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netBalance = totalIncomeForMonth - totalSpending;
  const savingsRate = totalIncomeForMonth > 0 ? (netBalance / totalIncomeForMonth) * 100 : 0;


  if (profileLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <p className="text-xl">Loading profile...</p>
        </main>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <p className="text-xl">Please select a profile to view the dashboard.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <MobileNavigation />
      <ScrollArea className="flex-grow pb-20 lg:pb-0">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center gap-4 mb-8">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth} disabled={isLoadingData}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold text-center w-52 font-headline">
              {format(viewingDate, 'MMMM yyyy')}
            </h2>
            <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isLoadingData}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Warning banner when viewing another user's profile */}
          {isReadOnlyMode && (
            <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-amber-800">
                    Viewing {currentProfile?.name}'s dashboard (Read-only mode)
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    You can view this data but cannot add or modify expenses and incomes.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {isLoadingData && <p className="text-center py-10">Loading financial data for {currentProfile.name}...</p>}

            {!isLoadingData && (
              <>
                {/* Mobile Quick Expense Entry - only show if not in read-only mode */}
                {!isReadOnlyMode && (
                  <div className="lg:hidden mb-8" id="quick-add">
                    <QuickExpenseEntry
                      profileId={currentProfile.id}
                      onExpenseAdded={handleAddExpense}
                    />
                  </div>
                )}

                <SummaryCards expenses={expenses} totalManualIncomes={totalManuallyLoggedIncome} calculatedRecurringIncome={calculatedRecurringIncome} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  <div className="lg:col-span-2 space-y-8">
                    <SpendingChart data={spendingByCategory.filter(d => d.total > 0)} />
                  </div>
                  <div className="space-y-4">
                    <Card className="shadow-md">
                      <CardHeader>
                        <CardTitle className="font-headline text-lg">Monthly Financial Snapshot</CardTitle>
                        <CardDescription>Income, expenses, and balance for {currentProfile.name}.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm space-y-3">
                        <div>
                          <h4 className="font-semibold mb-1">Income</h4>
                          <div className="flex justify-between">
                            <span>Recurring:</span>
                            <span className="font-medium">{formatCurrency(calculatedRecurringIncome)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Manually Logged:</span>
                            <span className="font-medium">{formatCurrency(totalManuallyLoggedIncome)}</span>
                          </div>
                          <hr className="my-1 border-border/50" />
                          <div className="flex justify-between font-bold">
                            <span>Total Income:</span>
                            <span className="text-accent">{formatCurrency(totalIncomeForMonth)}</span>
                          </div>
                        </div>
                        <hr className="my-2 border-border" />
                        <div>
                          <div className="flex justify-between font-bold">
                            <span>Total Expenses:</span>
                            <span className="text-destructive">{formatCurrency(totalSpending)}</span>
                          </div>
                        </div>
                        <hr className="my-2 border-border" />
                        <div>
                          <div className="flex justify-between font-bold text-base items-center">
                            <span>Net Balance:</span>
                            <span className={netBalance >= 0 ? 'text-accent' : 'text-destructive'}>
                              {formatCurrency(netBalance)}
                            </span>
                          </div>
                          {totalIncomeForMonth > 0 && (
                            <div className="flex justify-between text-xs mt-1 items-center">
                              <span>Savings Rate:</span>
                              <span className={`font-medium flex items-center ${savingsRate >= 0 ? 'text-accent' : 'text-destructive'}`}>
                                {savingsRate >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                                {savingsRate.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <AiInsights expenses={expenses} totalIncome={totalIncomeForMonth} currentProfile={currentProfile} />
                    <RecurringExpenseManager
                      profileId={currentProfile.id}
                      onRecurringExpenseChange={async () => {
                        const fetchedExpenses = await getExpenses(currentProfile.id, viewingDate.getFullYear(), viewingDate.getMonth());
                        setExpenses(fetchedExpenses);
                      }}
                    />
                  </div>
                </div>

                {(expenses.length === 0 && manuallyLoggedincomes.length === 0 && calculatedRecurringIncome === 0) && (
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle>Welcome to SmartSpend, {currentProfile.name}!</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        It looks like you don't have any financial data for {format(viewingDate, 'MMMM yyyy')}.
                        Start by adding some expenses or any additional incomes using the forms below.
                      </p>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="font-headline flex items-center">
                        <PlusCircle className="h-6 w-6 mr-2 text-primary" />
                        Add New Expense for {currentProfile.name}
                      </CardTitle>
                      <CardDescription>
                        Log your recent spending.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ExpenseForm
                        categories={CATEGORIES}
                        profiles={PERSONS}
                        onFormSubmit={handleAddExpense}
                        defaultDate={viewingDate}
                        mode="add"
                        currentProfileIdForAddMode={user?.uid || currentProfile.id}
                        disabled={isLoadingData}
                      />
                    </CardContent>
                  </Card>
                  <IncomeForm
                    onFormSubmit={handleAddIncomeFormSubmitWrapped}
                    currentViewingDateForAdd={viewingDate}
                    mode="add"
                    disabled={isLoadingData}
                  />
                </div>
              </>
            )}
          </div>
        </main>
      </ScrollArea>
      <footer className="text-center py-4 border-t text-sm text-muted-foreground">
        {currentYear && <>© {currentYear} SmartSpend. All rights reserved.</>}
        {!currentYear && <>© SmartSpend. All rights reserved.</>}
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
