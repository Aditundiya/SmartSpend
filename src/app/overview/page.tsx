
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Expense, Income, SpendingByCategory } from '@/lib/types';
import AppHeader from '@/components/AppHeader';
import MobileNavigation from '@/components/MobileNavigation';
import SummaryCards from '@/components/SummaryCards';
import SpendingChart from '@/components/SpendingChart';
import { CATEGORIES, CATEGORY_COLORS, INCOME_FREQUENCIES_CONFIG } from '@/data/constants';
import { useProfile } from '@/contexts/ProfileContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { addMonths, subMonths, format, startOfMonth } from 'date-fns';
import { getExpenses, getIncomes } from '@/lib/firebase';
import { useCurrency } from '@/hooks/use-currency';
import ProtectedRoute from '@/components/ProtectedRoute';

interface ProfileFinancialSummary {
  profileId: string;
  name: string;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
}

// Helper function to calculate recurring income for a given profile and month
const calculateRecurringIncomesForMonth = (profileId: string, year: number, month: number): number => {
  let totalRecurring = 0;
  // Use dynamic templates from localStorage instead of static config
  const { getActiveRecurringIncomeTemplates } = require('@/lib/recurring-income');
  const templates = getActiveRecurringIncomeTemplates(profileId);

  templates.forEach((template: any) => {
    const frequencyConfig = INCOME_FREQUENCIES_CONFIG.find(f => f.id === template.frequency);
    if (frequencyConfig) {
      totalRecurring += template.amount * frequencyConfig.occurrencesPerMonth;
    }
  });
  return totalRecurring;
};

function OverviewContent() {
  const { profiles, loading: profilesLoading } = useProfile();
  const { format: formatCurrency } = useCurrency();
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [totalManualIncomesCombined, setTotalManualIncomesCombined] = useState(0);
  const [totalRecurringIncomeCombined, setTotalRecurringIncomeCombined] = useState(0);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('all');
  const [profileFinancialSummaries, setProfileFinancialSummaries] = useState<ProfileFinancialSummary[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [viewingDate, setViewingDate] = useState(new Date());
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  useEffect(() => {
    if (profilesLoading) return;

    const loadOverviewData = async () => {
      setIsLoadingData(true);
      // Clear previous data when fetching new data
      setAllExpenses([]);
      setTotalManualIncomesCombined(0);
      setTotalRecurringIncomeCombined(0);
      setProfileFinancialSummaries([]);

      try {
        const year = viewingDate.getFullYear();
        const month = viewingDate.getMonth();

        let combinedExpenses: Expense[] = [];
        let combinedManualIncomes = 0;
        let combinedRecurringIncomes = 0;
        const newProfileSummaries: ProfileFinancialSummary[] = [];

        // Determine which profiles to fetch
        const profilesToFetch = selectedProfileId === 'all'
          ? profiles
          : profiles.filter(p => p.id === selectedProfileId);

        for (const profile of profilesToFetch) {
          const [personExpensesList, personManualIncomesList] = await Promise.all([
            getExpenses(profile.id, year, month),
            getIncomes(profile.id, year, month)
          ]);
          combinedExpenses = combinedExpenses.concat(personExpensesList);

          const currentPersonManualIncome = personManualIncomesList.reduce((sum, income) => sum + income.amount, 0);
          const currentPersonRecurringIncome = calculateRecurringIncomesForMonth(profile.id, year, month);
          const currentPersonTotalIncome = currentPersonManualIncome + currentPersonRecurringIncome;

          combinedManualIncomes += currentPersonManualIncome;
          combinedRecurringIncomes += currentPersonRecurringIncome;

          const currentPersonTotalExpenses = personExpensesList.reduce((sum, exp) => sum + exp.amount, 0);

          newProfileSummaries.push({
            profileId: profile.id,
            name: profile.name,
            totalIncome: currentPersonTotalIncome,
            totalExpenses: currentPersonTotalExpenses,
            netBalance: currentPersonTotalIncome - currentPersonTotalExpenses,
          });
        }

        setAllExpenses(combinedExpenses);
        setTotalManualIncomesCombined(combinedManualIncomes);
        setTotalRecurringIncomeCombined(combinedRecurringIncomes);
        setProfileFinancialSummaries(newProfileSummaries);

      } catch (error) {
        console.error("Error loading overview data from Firestore:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Overview Data",
          description: "Could not fetch combined financial data. Please try again.",
        });
      } finally {
        setIsLoadingData(false);
      }
    };

    loadOverviewData();
  }, [viewingDate, toast, profiles, profilesLoading, selectedProfileId]);

  const combinedSpendingByCategory = useMemo<SpendingByCategory[]>(() => {
    return CATEGORIES.map(category => {
      const categoryExpenses = allExpenses.filter(e => e.categoryId === category.id);
      const totalSpent = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
      const color = (CATEGORY_COLORS as Record<string, string>)[category.id] || 'hsl(var(--muted-foreground))';

      return {
        name: category.name,
        total: totalSpent,
        fill: color,
      };
    }).filter(item => item.total > 0);
  }, [allExpenses]);

  const handlePreviousMonth = () => {
    setViewingDate(prev => subMonths(startOfMonth(prev), 1));
  };

  const handleNextMonth = () => {
    setViewingDate(prev => addMonths(startOfMonth(prev), 1));
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <MobileNavigation />
      <ScrollArea className="flex-grow pb-20 lg:pb-0">
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <div className="hidden md:block w-48"></div> {/* Spacer for symmetry */}

            <div className="flex items-center justify-center gap-4">
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

            <div className="w-full md:w-48">
              {profiles.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <div className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        {selectedProfileId === 'all' ? 'All Profiles' : profiles.find(p => p.id === selectedProfileId)?.name}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-48">
                    <DropdownMenuLabel>Filter by Profile</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={selectedProfileId} onValueChange={setSelectedProfileId}>
                      <DropdownMenuRadioItem value="all">All Profiles</DropdownMenuRadioItem>
                      {profiles.map(p => (
                        <DropdownMenuRadioItem key={p.id} value={p.id}>
                          {p.name}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <h1 className="text-3xl font-bold text-center font-headline text-primary">
              {selectedProfileId === 'all' ? 'Combined Financial Overview' : `${profiles.find(p => p.id === selectedProfileId)?.name}'s Overview`}
            </h1>
            {isLoadingData && <p className="text-center py-10">Loading overview data...</p>}

            {!isLoadingData && (
              <>
                <SummaryCards
                  expenses={allExpenses}
                  totalManualIncomes={totalManualIncomesCombined}
                  calculatedRecurringIncome={totalRecurringIncomeCombined}
                />

                <SpendingChart data={combinedSpendingByCategory.filter(d => d.total > 0)} />

                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="font-headline flex items-center">
                      <Users className="h-6 w-6 mr-2 text-primary" />
                      Profile Financial Summary
                    </CardTitle>
                    <CardDescription>Income, expenses, and net balance per profile for {format(viewingDate, 'MMMM yyyy')}.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {profileFinancialSummaries.length > 0 ? (
                      <>
                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Profile</TableHead>
                                <TableHead className="text-right">Total Income</TableHead>
                                <TableHead className="text-right">Total Expenses</TableHead>
                                <TableHead className="text-right">Net Balance</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {profileFinancialSummaries.map((summary) => (
                                <TableRow key={summary.profileId}>
                                  <TableCell className="font-medium whitespace-nowrap">{summary.name}</TableCell>
                                  <TableCell className="text-right text-accent whitespace-nowrap">{formatCurrency(summary.totalIncome)}</TableCell>
                                  <TableCell className="text-right text-destructive whitespace-nowrap">{formatCurrency(summary.totalExpenses)}</TableCell>
                                  <TableCell className={`text-right font-semibold whitespace-nowrap ${summary.netBalance >= 0 ? 'text-accent' : 'text-destructive'}`}>
                                    {formatCurrency(summary.netBalance)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden space-y-4">
                          {profileFinancialSummaries.map((summary) => (
                            <div key={summary.profileId} className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm space-y-3">
                              <div className="flex justify-between items-center border-b pb-2">
                                <h4 className="font-semibold">{summary.name}</h4>
                                <span className={`font-bold ${summary.netBalance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {formatCurrency(summary.netBalance)}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground text-xs">Total Income</p>
                                  <p className="font-medium text-green-600">{formatCurrency(summary.totalIncome)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-muted-foreground text-xs">Total Expenses</p>
                                  <p className="font-medium text-red-500">{formatCurrency(summary.totalExpenses)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      !isLoadingData && <p className="text-muted-foreground text-center py-5">No individual profile data to display for this period.</p>
                    )}
                  </CardContent>
                </Card>

                {allExpenses.length === 0 && totalManualIncomesCombined === 0 && totalRecurringIncomeCombined === 0 && (
                  <p className="text-muted-foreground text-center py-10">
                    No combined financial data available for {format(viewingDate, 'MMMM yyyy')}.
                  </p>
                )}
              </>
            )}
          </div>
        </main>
      </ScrollArea>
      <footer className="text-center py-4 border-t text-sm text-muted-foreground">
        {currentYear && <>© {currentYear} Spentra. All rights reserved.</>}
        {!currentYear && <>© Spentra. All rights reserved.</>}
      </footer>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <ProtectedRoute>
      <OverviewContent />
    </ProtectedRoute>
  )
}
