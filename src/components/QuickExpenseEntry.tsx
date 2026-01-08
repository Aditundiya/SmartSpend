'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Plus, Zap, Wifi, WifiOff } from 'lucide-react';
import { CATEGORIES, CATEGORY_COLORS } from '@/data/constants';
import { expenseFormSchema, type ExpenseFormValues } from '@/lib/validations';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/use-currency';
import { isOnline, offlineStorage } from '@/lib/offline-storage';
import type { Category } from '@/lib/types';

interface QuickExpenseEntryProps {
  profileId: string;
  onExpenseAdded: (expense: ExpenseFormValues) => void;
  className?: string;
}

export default function QuickExpenseEntry({ profileId, onExpenseAdded, className }: QuickExpenseEntryProps) {
  const { format: formatCurrency } = useCurrency();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(isOnline());
  const { toast } = useToast();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: '',
      amount: '' as any,
      categoryId: '',
      date: new Date(),
      profileId: profileId,
    },
  });

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setNetworkStatus(true);
    const handleOffline = () => setNetworkStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    form.setValue('categoryId', category.id);
  };

  const onSubmit = async (data: ExpenseFormValues) => {
    if (!selectedCategory) {
      toast({
        variant: 'destructive',
        title: 'Category Required',
        description: 'Please select a category for your expense.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const expenseData = {
        ...data,
        profileId,
        date: new Date(),
      };

      if (networkStatus) {
        // Online: Submit normally
        await onExpenseAdded(expenseData);
        toast({
          title: 'Expense Added',
          description: `${data.description} - ${formatCurrency(data.amount)}`,
          className: 'bg-green-50 text-green-900 border-green-200',
        });
      } else {
        // Offline: Store locally
        await offlineStorage.addOfflineExpense(expenseData);
        toast({
          title: 'Expense Saved Offline',
          description: `${data.description} - ${formatCurrency(data.amount)} (will sync when online)`,
          className: 'bg-orange-50 text-orange-900 border-orange-200',
        });
      }

      // Reset form
      form.reset({
        description: '',
        amount: '' as any,
        categoryId: '',
        date: new Date(),
        profileId: profileId,
      });
      setSelectedCategory(null);

    } catch (error) {
      console.error('Error adding expense:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add expense. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick amount buttons for common expenses
  const quickAmounts = [5, 10, 20, 50, 100];

  const handleQuickAmount = (amount: number) => {
    form.setValue('amount', amount);
  };

  return (
    <Card className={`shadow-lg border-2 ${networkStatus ? 'border-green-200' : 'border-orange-200'} ${className}`}>
      <CardContent className="p-4">
        {/* Network Status Indicator */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center">
            <Zap className="h-5 w-5 mr-2 text-primary" />
            Quick Add Expense
          </h3>
          <Badge variant={networkStatus ? 'default' : 'secondary'} className="text-xs">
            {networkStatus ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </>
            )}
          </Badge>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Description Input */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="What did you buy?"
                      className="text-lg h-12"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount Input with Quick Buttons */}
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="text-xl h-14 text-center font-bold"
                        {...field}
                        value={field.value === undefined || field.value === null ? '' : String(field.value)}
                        onChange={e => field.onChange(parseFloat(e.target.value) || '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quick Amount Buttons */}
              <div className="flex gap-2 justify-center" role="group" aria-label="Quick amount selection">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(amount)}
                    className="text-xs"
                    aria-label={`Set amount to $${amount}`}
                  >
                    ${amount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <p className="text-sm font-medium" id="category-label">Category:</p>
              <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="category-label">
                {CATEGORIES.slice(0, 9).map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategory?.id === category.id;
                  const color = (CATEGORY_COLORS as Record<string, string>)[category.id];

                  return (
                    <Button
                      key={category.id}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleCategorySelect(category)}
                      className={`h-16 flex flex-col gap-1 text-xs ${isSelected ? 'ring-2 ring-primary' : ''
                        }`}
                      style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                      aria-pressed={isSelected}
                      aria-label={`Select ${category.name} category`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="truncate">{category.name}</span>
                    </Button>
                  );
                })}
              </div>

              {selectedCategory && (
                <Badge
                  className="mt-2"
                  style={{
                    backgroundColor: (CATEGORY_COLORS as Record<string, string>)[selectedCategory.id],
                    color: 'white'
                  }}
                >
                  Selected: {selectedCategory.name}
                </Badge>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold"
              disabled={isSubmitting || !selectedCategory}
            >
              <Plus className="h-5 w-5 mr-2" />
              {isSubmitting ? 'Adding...' : networkStatus ? 'Add Expense' : 'Save Offline'}
            </Button>
          </form>
        </Form>

        {/* Offline Notice */}
        {!networkStatus && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-800">
            <WifiOff className="h-3 w-3 inline mr-1" />
            You're offline. Expenses will be saved locally and synced when you're back online.
          </div>
        )}
      </CardContent>
    </Card>
  );
}