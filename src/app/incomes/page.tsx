
'use client';

import AppHeader from '@/components/AppHeader';
import MobileNavigation from '@/components/MobileNavigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Income, IncomeFormValues } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { INCOME_FREQUENCIES_CONFIG } from '@/data/constants';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Trash2, ChevronLeft, ChevronRight, Edit, DollarSign } from 'lucide-react';
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
import { getIncomes, deleteIncomeFS, updateIncomeFS } from '@/lib/firebase';
import IncomeForm from '@/components/IncomeForm';
import { useProfile } from '@/contexts/ProfileContext';
import { useCurrency } from '@/hooks/use-currency';
import ProtectedRoute from '@/components/ProtectedRoute';


function IncomesContent() {
  const { currentProfile, loading: profileLoading, profiles } = useProfile();
  const { user } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const [manualIncomes, setManualIncomes] = useState<Income[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingDate, setViewingDate] = useState(new Date());
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedIncomeForEdit, setSelectedIncomeForEdit] = useState<Income | null>(null);

  const isReadOnlyMode = useMemo(() => {
    if (!user || !currentProfile) return true;
    const isOwner = currentProfile.id === user.uid;
    const isPartnerOfThisProfile = currentProfile.partnerUid === user.uid;
    return !isOwner && !isPartnerOfThisProfile;
  }, [user, currentProfile]);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const loadPageData = useCallback(async () => {
    if (!currentProfile) return;

    setIsLoading(true);
    try {
      const year = viewingDate.getFullYear();
      const month = viewingDate.getMonth();
      const fetchedIncomes = await getIncomes(currentProfile.id, year, month);
      setManualIncomes(fetchedIncomes);
    } catch (error) {
      console.error("Error loading incomes from Firestore:", error);
      toast({
        variant: "destructive",
        title: "Error Loading Incomes",
        description: "Could not fetch manually logged incomes. Please try again.",
      });
      setManualIncomes([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentProfile, viewingDate, toast]);


  useEffect(() => {
    if (currentProfile) {
      loadPageData();
    } else if (!profileLoading && !currentProfile) {
      setManualIncomes([]);
      setIsLoading(false);
    }
    // If profileLoading is true, we wait for it to finish
  }, [currentProfile, profileLoading, loadPageData]);

  const getFrequencyName = (frequencyId: string) => {
    return INCOME_FREQUENCIES_CONFIG.find(freq => freq.id === frequencyId)?.name || 'N/A';
  }

  const handleDeleteIncome = async (incomeId: string) => {
    if (!currentProfile) return;
    setIsLoading(true);
    try {
      await deleteIncomeFS(currentProfile.id, incomeId);
      await loadPageData(); // Re-fetch data after deleting
      toast({
        title: "Income Deleted",
        description: "The selected income has been removed.",
        className: "bg-accent text-accent-foreground"
      });
    } catch (error) {
      console.error("Error deleting income from Firestore:", error);
      toast({
        variant: "destructive",
        title: "Error Deleting Income",
        description: "Could not delete income. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEditDialog = (income: Income) => {
    setSelectedIncomeForEdit(income);
    setIsEditDialogOpen(true);
  };

  const handleFormSubmit = async (data: IncomeFormValues, editingId?: string) => {
    if (!currentProfile || !editingId) return;
    setIsLoading(true);

    const incomeDataToUpdate: Partial<Omit<Income, 'id' | 'profileId'>> & { date?: Date } = {
      description: data.description,
      amount: data.amount,
      frequency: data.frequency,
      date: data.date,
    };

    try {
      await updateIncomeFS(currentProfile.id, editingId, incomeDataToUpdate);
      await loadPageData(); // Re-fetch data after updating
      toast({
        title: "Income Updated",
        description: "Your income has been successfully updated.",
        className: "bg-accent text-accent-foreground"
      });
      setIsEditDialogOpen(false);
      setSelectedIncomeForEdit(null);
    } catch (error) {
      console.error("Error updating income:", error);
      toast({
        variant: "destructive",
        title: "Error Updating Income",
        description: "Could not update income. Please try again.",
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
          <p className="text-xl">Please select a profile to manage incomes.</p>
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
            <Button variant="outline" size="icon" onClick={handlePreviousMonth} disabled={isLoading}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold text-center w-52 font-headline">
              {format(viewingDate, 'MMMM yyyy')}
            </h2>
            <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isLoading}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="font-headline flex items-center">
                    <DollarSign className="h-6 w-6 mr-2 text-primary" />
                    Manually Logged Incomes for {currentProfile.name}
                  </CardTitle>
                  <CardDescription>View and manage your non-recurring incomes for {format(viewingDate, 'MMMM yyyy')}.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && <p className="text-center py-10">Loading incomes for {currentProfile.name}...</p>}

              {!isLoading && manualIncomes.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {manualIncomes.map((income) => (
                        <TableRow key={income.id}>
                          <TableCell className="whitespace-nowrap">{format(income.date, 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="font-medium min-w-[150px]">{income.description}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{getFrequencyName(income.frequency)}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(income.amount)}</TableCell>
                          <TableCell className="text-center space-x-1 whitespace-nowrap">
                            <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-700" onClick={() => handleOpenEditDialog(income)} disabled={isLoading || isReadOnlyMode}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90" disabled={isLoading || isReadOnlyMode}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Income Entry?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete the income: "{income.description}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteIncome(income.id)}
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                !isLoading && <p className="text-muted-foreground text-center py-10">No manually logged incomes recorded for {currentProfile.name} in {format(viewingDate, 'MMMM yyyy')}.</p>
              )}
            </CardContent>
          </Card>
        </main>
      </ScrollArea>

      {selectedIncomeForEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setSelectedIncomeForEdit(null);
        }}>
          <DialogContent className="sm:max-w-[425px] md:max-w-md lg:max-w-lg">
            <ShadDialogHeader>
              <ShadDialogTitle>Edit Income Entry</ShadDialogTitle>
              <ShadDialogDescription>
                Update the details of this manually logged income.
              </ShadDialogDescription>
            </ShadDialogHeader>
            <div className="pt-4">
              <IncomeForm
                onFormSubmit={handleFormSubmit}
                currentViewingDateForAdd={viewingDate}
                initialValues={{
                  id: selectedIncomeForEdit.id,
                  description: selectedIncomeForEdit.description,
                  amount: selectedIncomeForEdit.amount,
                  frequency: selectedIncomeForEdit.frequency,
                  date: selectedIncomeForEdit.date,
                }}
                mode="edit"
                disabled={isLoading}
                isDialog={true}
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

export default function IncomesPage() {
  return (
    <ProtectedRoute>
      <IncomesContent />
    </ProtectedRoute>
  )
}
