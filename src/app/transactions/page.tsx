
'use client';

import AppHeader from '@/components/AppHeader';
import MobileNavigation from '@/components/MobileNavigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Expense } from '@/lib/types';
import { CATEGORIES } from '@/data/constants';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader as ShadDialogHeader,
  DialogTitle as ShadDialogTitle,
  DialogDescription as ShadDialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getExpenses, deleteExpenseFS, updateExpenseFS, addExpenseFS } from '@/lib/firebase';
import ExpenseForm from '@/components/ExpenseForm';
import type { ExpenseFormValues } from '@/lib/validations';
import ExportButton from '@/components/ExportButton';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/hooks/use-currency';
import ProtectedRoute from '@/components/ProtectedRoute';


function TransactionsContent() {
  const { currentProfile, loading: profileLoading, profiles: allProfilesFromContext } = useProfile();
  const { user } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const allProfiles = allProfilesFromContext || []; // Defensive, though context should provide it
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingDate, setViewingDate] = useState(new Date());
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedExpenseForEdit, setSelectedExpenseForEdit] = useState<Expense | null>(null);

  // Check if viewing another user's profile (read-only mode)
  const isReadOnlyMode = useMemo(() => {
    if (!user || !currentProfile) return true;
    const isOwner = currentProfile.id === user.uid;
    const isPartnerOfThisProfile = currentProfile.partnerUid === user.uid;
    return !isOwner && !isPartnerOfThisProfile;
  }, [user, currentProfile]);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    CATEGORIES.forEach(cat => map.set(cat.id, cat.name));
    return map;
  }, []);

  const loadPageData = useCallback(async () => {
    if (!currentProfile) return;

    setIsLoading(true);
    try {
      const year = viewingDate.getFullYear();
      const month = viewingDate.getMonth();
      const fetchedExpenses = await getExpenses(currentProfile.id, year, month);
      setExpenses(fetchedExpenses);
    } catch (error) {
      console.error("Error loading expenses from Firestore:", error);
      toast({
        variant: "destructive",
        title: "Error Loading Transactions",
        description: "Could not fetch transactions. Please try again.",
      });
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentProfile, viewingDate, toast]);

  useEffect(() => {
    if (currentProfile) {
      loadPageData();
    } else if (!profileLoading && !currentProfile) {
      setExpenses([]);
      setIsLoading(false);
    }
    // If profileLoading is true, we wait for it to finish
  }, [currentProfile, profileLoading, loadPageData]);


  const getCategoryName = (categoryId: string) => {
    return CATEGORIES.find(cat => cat.id === categoryId)?.name || 'N/A';
  }

  const handleDeleteExpense = async (expenseId: string, expenseProfileId: string) => {
    if (!currentProfile) return; // Should not happen if UI is correct
    setIsLoading(true); // Redundant if loadPageData sets it, but safe
    try {
      await deleteExpenseFS(expenseProfileId, expenseId);
      // Re-fetch expenses for the current profile if the deleted expense belonged to them
      if (expenseProfileId === currentProfile.id) {
        await loadPageData(); // Re-fetch data
      }
      toast({
        title: "Expense Deleted",
        description: "The selected expense has been removed.",
        className: "bg-accent text-accent-foreground"
      });
    } catch (error) {
      console.error("Error deleting expense from Firestore:", error);
      toast({
        variant: "destructive",
        title: "Error Deleting Expense",
        description: "Could not delete expense. Please try again.",
      });
    } finally {
      setIsLoading(false); // Ensure loading is false
    }
  };

  const handleOpenEditDialog = (expense: Expense) => {
    setSelectedExpenseForEdit(expense);
    setIsEditDialogOpen(true);
  };

  const handleUpdateExpense = async (data: ExpenseFormValues, editingId?: string) => {
    if (!editingId || !selectedExpenseForEdit || !currentProfile) return;
    setIsLoading(true);

    const originalProfileId = selectedExpenseForEdit.profileId;
    const newProfileIdFromForm = data.profileId;

    try {
      if (newProfileIdFromForm !== originalProfileId) {
        // Expense is being moved to a different profile
        const expenseToMove: Omit<Expense, 'id'> = {
          description: data.description,
          amount: data.amount,
          categoryId: data.categoryId,
          date: data.date,
          profileId: newProfileIdFromForm, // This is the new profileId
        };
        // Add to new profile's expenses
        await addExpenseFS(newProfileIdFromForm, expenseToMove);
        // Delete from old profile's expenses
        await deleteExpenseFS(originalProfileId, editingId);

        toast({
          title: "Expense Moved",
          description: `Expense "${data.description}" moved to ${allProfiles.find(p => p.id === newProfileIdFromForm)?.name || 'new profile'}.`,
          className: "bg-accent text-accent-foreground"
        });

      } else {
        // Expense profile hasn't changed, just update its details
        const updatedExpenseData: Partial<Omit<Expense, 'id'>> & { date?: Date, profileId?: string } = {
          description: data.description,
          amount: data.amount,
          categoryId: data.categoryId,
          date: data.date,
          profileId: data.profileId, // Keep existing profileId
        };
        await updateExpenseFS(originalProfileId, editingId, updatedExpenseData);

        toast({
          title: "Expense Updated",
          description: "Your expense has been successfully updated.",
          className: "bg-accent text-accent-foreground"
        });
      }

      await loadPageData(); // Re-fetch data for current profile

      setIsEditDialogOpen(false);
      setSelectedExpenseForEdit(null);
    } catch (error) {
      console.error("Error updating/moving expense:", error);
      toast({
        variant: "destructive",
        title: "Error Updating Expense",
        description: "Could not update or move expense. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handlePreviousMonth = () => {
    setViewingDate(prev => subMonths(startOfMonth(prev), 1));
  };

  const handleNextMonth = () => {
    setViewingDate(prev => addMonths(startOfMonth(prev), 1));
  };

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
          <p className="text-xl">Please select a profile to view transactions.</p>
        </main>
      </div>
    );
  }
  // If here, currentProfile exists and profileLoading is false.

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <MobileNavigation />
      <ScrollArea className="flex-grow pb-20 lg:pb-0">
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth} disabled={isLoading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl sm:text-2xl font-bold text-center min-w-[140px] sm:w-52 font-headline">
              {format(viewingDate, 'MMMM yyyy')}
            </h2>
            <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isLoading}>
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
                    Viewing {currentProfile.name}'s expenses (Read-only mode)
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    You can view these transactions but cannot edit or delete them.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                  <CardTitle className="font-headline text-xl sm:text-2xl">
                    Transactions for {currentProfile.name}
                  </CardTitle>
                  <CardDescription>
                    {format(viewingDate, 'MMMM yyyy')} - View and manage recorded expenses.
                  </CardDescription>
                </div>
                <div className="w-full sm:w-auto flex justify-end">
                  <ExportButton
                    expenses={expenses}
                    filename={`SmartSpend_${currentProfile.name}_Transactions_${format(viewingDate, 'MMMM_yyyy')}.csv`}
                    categoryMap={categoryMap}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && <p className="text-center py-10">Loading transactions for {currentProfile.name}...</p>}

              {!isLoading && expenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Profile</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => {
                        const expenseProfile = allProfiles.find(p => p.id === expense.profileId);
                        return (
                          <TableRow key={expense.id}>
                            <TableCell className="whitespace-nowrap">{format(expense.date, 'MMM dd, yyyy')}</TableCell>
                            <TableCell className="font-medium min-w-[150px]">{expense.description}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{getCategoryName(expense.categoryId)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={expense.profileId === user?.uid ? "bg-primary/10 text-primary border-primary" : ""}
                              >
                                {expenseProfile?.name || 'Unknown'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                            <TableCell className="text-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-blue-600 hover:text-blue-700"
                                onClick={() => handleOpenEditDialog(expense)}
                                disabled={isLoading || expense.profileId !== user?.uid}
                                title={expense.profileId !== user?.uid ? "You can only edit your own expenses" : "Edit expense"}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive/90"
                                    disabled={isLoading || expense.profileId !== user?.uid}
                                    title={expense.profileId !== user?.uid ? "You can only delete your own expenses" : "Delete expense"}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete the expense: "{expense.description}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteExpense(expense.id, expense.profileId)}
                                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                !isLoading && <p className="text-muted-foreground text-center py-10">No transactions recorded for {currentProfile.name} in {format(viewingDate, 'MMMM yyyy')}.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </ScrollArea>

      {selectedExpenseForEdit && currentProfile && (
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedExpenseForEdit(null);
        }}>
          <DialogContent className="sm:max-w-[425px] md:max-w-md lg:max-w-lg">
            <ShadDialogHeader>
              <ShadDialogTitle>Edit Expense</ShadDialogTitle>
              <ShadDialogDescription>
                Update the details of this expense. You can also change the profile it belongs to.
              </ShadDialogDescription>
            </ShadDialogHeader>
            <div className="pt-4">
              <ExpenseForm
                categories={CATEGORIES}
                profiles={allProfiles}
                onFormSubmit={handleUpdateExpense}
                defaultDate={selectedExpenseForEdit.date} // This should be the expense's date
                initialValues={{
                  id: selectedExpenseForEdit.id,
                  description: selectedExpenseForEdit.description,
                  amount: selectedExpenseForEdit.amount,
                  categoryId: selectedExpenseForEdit.categoryId,
                  date: selectedExpenseForEdit.date,
                  profileId: selectedExpenseForEdit.profileId,
                }}
                mode="edit"
                disabled={isLoading}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <footer className="text-center py-4 border-t text-sm text-muted-foreground">
        {currentYear && <>© {currentYear} SmartSpend. All rights reserved.</>}
        {!currentYear && <>© SmartSpend. All rights reserved.</>}
      </footer>
    </div>
  );
}


export default function TransactionsPage() {
  return (
    <ProtectedRoute>
      <TransactionsContent />
    </ProtectedRoute>
  )
}
