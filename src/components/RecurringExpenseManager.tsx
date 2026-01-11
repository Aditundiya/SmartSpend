'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar, DollarSign, RefreshCw, Tag, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '@/hooks/use-currency';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES } from '@/data/constants';
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
} from '@/components/ui/alert-dialog';
import type { RecurringExpenseTemplate } from '@/lib/recurring-expense';

interface RecurringExpenseManagerProps {
    profileId: string;
    onRecurringExpenseChange?: () => void;
}

export default function RecurringExpenseManager({ profileId, onRecurringExpenseChange }: RecurringExpenseManagerProps) {
    const { format: formatCurrency } = useCurrency();
    const [templates, setTemplates] = useState<RecurringExpenseTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadTemplates = async () => {
        try {
            const { getActiveRecurringExpenseTemplates } = await import('@/lib/recurring-expense');
            const activeTemplates = getActiveRecurringExpenseTemplates(profileId);
            setTemplates(activeTemplates);
        } catch (error) {
            console.error('Error loading recurring expense templates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, [profileId]);

    const handleDeactivateTemplate = async (templateId: string, description: string) => {
        try {
            const { deactivateRecurringExpenseTemplate } = await import('@/lib/recurring-expense');
            deactivateRecurringExpenseTemplate(templateId);

            toast({
                title: 'Recurring Expense Stopped',
                description: `"${description}" will no longer generate automatic expense records.`,
                className: 'bg-accent text-accent-foreground'
            });

            await loadTemplates();
            onRecurringExpenseChange?.();
        } catch (error) {
            console.error('Error deactivating template:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to stop recurring expense. Please try again.',
            });
        }
    };

    const handleGenerateRecords = async (templateId: string) => {
        try {
            const { generateExpenseRecordsForTemplate, getRecurringExpenseTemplates } = await import('@/lib/recurring-expense');
            const allTemplates = getRecurringExpenseTemplates();
            const template = allTemplates.find(t => t.id === templateId);

            if (template) {
                const futureDate = new Date();
                futureDate.setFullYear(futureDate.getFullYear() + 1);
                await generateExpenseRecordsForTemplate(template, futureDate);

                toast({
                    title: 'Records Generated',
                    description: 'Future expense records have been generated successfully.',
                    className: 'bg-accent text-accent-foreground'
                });

                onRecurringExpenseChange?.();
            }
        } catch (error) {
            console.error('Error generating records:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to generate expense records. Please try again.',
            });
        }
    };

    const getCategoryName = (categoryId: string) => {
        const category = CATEGORIES.find(c => c.id === categoryId);
        return category?.name || 'Unknown';
    };

    const getCategoryIcon = (categoryId: string) => {
        const category = CATEGORIES.find(c => c.id === categoryId);
        return category?.icon || Tag;
    };

    const getFrequencyColor = (frequency: string) => {
        switch (frequency) {
            case 'weekly': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'fortnightly': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'monthly': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
    };

    const getMonthlyEquivalent = (amount: number, frequency: string) => {
        switch (frequency) {
            case 'weekly':
                return amount * 4.33; // Average weeks per month
            case 'fortnightly':
                return amount * 2.17; // Average fortnights per month
            case 'monthly':
                return amount;
            default:
                return amount;
        }
    };

    const totalMonthlyRecurring = templates.reduce((sum, template) => {
        return sum + getMonthlyEquivalent(template.amount, template.frequency);
    }, 0);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <RefreshCw className="h-5 w-5 mr-2" />
                        Recurring Expenses
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Loading...</p>
                </CardContent>
            </Card>
        );
    }

    if (templates.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <RefreshCw className="h-5 w-5 mr-2" />
                        Recurring Expenses
                    </CardTitle>
                    <CardDescription>
                        Manage your regular expenses like rent, subscriptions, and bills
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        No recurring expenses set up. Add a weekly, fortnightly, or monthly expense to see it here.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        💡 Tip: Use the expense form above and select a frequency (weekly, fortnightly, or monthly) to create recurring expenses.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                        <RefreshCw className="h-5 w-5 mr-2" />
                        Recurring Expenses ({templates.length})
                    </div>
                    <div className="text-sm font-normal text-muted-foreground">
                        ~{formatCurrency(totalMonthlyRecurring)}/month
                    </div>
                </CardTitle>
                <CardDescription>
                    Automatic expenses that repeat on a schedule
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {templates.map((template) => {
                    const CategoryIcon = getCategoryIcon(template.categoryId);
                    const monthlyAmount = getMonthlyEquivalent(template.amount, template.frequency);

                    return (
                        <div key={template.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors gap-4">
                            <div className="flex-1 w-full">
                                <div className="flex items-center gap-2 mb-2">
                                    <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="font-medium">{template.description}</h4>
                                    <Badge className={getFrequencyColor(template.frequency)}>
                                        {template.frequency}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <DollarSign className="h-4 w-4" />
                                        <span className="font-medium">{formatCurrency(template.amount)}</span>
                                        <span className="text-xs">
                                            (~{formatCurrency(monthlyAmount)}/mo)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Tag className="h-4 w-4" />
                                        {getCategoryName(template.categoryId)}
                                    </div>
                                    <div className="flex items-center gap-1 whitespace-nowrap">
                                        <Calendar className="h-4 w-4" />
                                        Started {format(template.startDate, 'MMM d, yyyy')}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGenerateRecords(template.id)}
                                    title="Generate future expense records"
                                >
                                    <RefreshCw className="h-4 w-4 mr-1" />
                                    Generate
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Stop Recurring Expense</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to stop "{template.description}"? This will prevent future automatic expense records from being generated. Existing records will not be affected.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDeactivateTemplate(template.id, template.description)}
                                                className="bg-destructive hover:bg-destructive/90"
                                            >
                                                Stop Recurring Expense
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    );
                })}

                <div className="pt-4 border-t">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Total Monthly Recurring:</span>
                        <span className="font-semibold text-lg">{formatCurrency(totalMonthlyRecurring)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
