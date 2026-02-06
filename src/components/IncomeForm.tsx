
'use client';

import type { Income, IncomeFrequencyId } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, DollarSign, PlusCircle, Save } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { INCOME_FREQUENCIES_CONFIG } from '@/data/constants';
import { incomeFormSchema, type IncomeFormValues } from '@/lib/validations';

interface IncomeFormProps {
  onFormSubmit: (data: IncomeFormValues, editingId?: string) => Promise<void>;
  currentViewingDateForAdd: Date;
  initialValues?: IncomeFormValues & { id?: string };
  mode: 'add' | 'edit';
  disabled?: boolean;
  isDialog?: boolean;
}

export default function IncomeForm({
  onFormSubmit,
  currentViewingDateForAdd,
  initialValues,
  mode,
  disabled = false,
  isDialog = false,
}: IncomeFormProps) {
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: mode === 'edit' && initialValues ? {
      description: initialValues.description,
      amount: initialValues.amount,
      frequency: initialValues.frequency,
      date: initialValues.date instanceof Date ? initialValues.date : new Date(initialValues.date),
    } : {
      description: '',
      amount: '' as any,
      frequency: 'one-time',
      date: startOfMonth(currentViewingDateForAdd),
    },
  });

  // Only reset form if mode changes or initialValues change (for switching between edit items)
  useEffect(() => {
    if (mode === 'edit' && initialValues) {
      form.reset({
        description: initialValues.description,
        amount: initialValues.amount,
        frequency: initialValues.frequency,
        date: initialValues.date instanceof Date ? initialValues.date : new Date(initialValues.date),
      });
    }
  }, [mode, initialValues, form]);

  async function onSubmit(data: IncomeFormValues) {
    const dataToSubmit = {
      ...data,
      date: data.date instanceof Date && !isNaN(data.date.getTime()) ? data.date : new Date(data.date),
    };
    await onFormSubmit(dataToSubmit, mode === 'edit' ? initialValues?.id : undefined);

    if (mode === 'add') {
      form.reset({
        description: '',
        amount: '' as any,
        frequency: 'one-time',
        date: startOfMonth(currentViewingDateForAdd),
      });
    }
  }

  const calendarDefaultMonth = mode === 'edit' && initialValues && initialValues.date instanceof Date && !isNaN(initialValues.date.getTime())
    ? initialValues.date
    : currentViewingDateForAdd instanceof Date && !isNaN(currentViewingDateForAdd.getTime())
      ? currentViewingDateForAdd
      : new Date();


  const formContent = (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          // Prevent accidental submission if the user clicked something that didn't have type="submit"
          // (Browsers default <button> to type="submit" unless specified otherwise)
          const submitter = (e.nativeEvent as any).submitter;
          if (submitter && submitter.getAttribute('type') !== 'submit') {
            e.preventDefault();
            return;
          }
          form.handleSubmit(onSubmit)(e);
        }}
        className="space-y-6"
      >
        <fieldset disabled={disabled} className="space-y-6">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Freelance Project" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="e.g., 500" {...field} value={field.value === undefined || field.value === null ? '' : String(field.value)} onChange={e => field.onChange(parseFloat(e.target.value) || '')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "one-time"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INCOME_FREQUENCIES_CONFIG.map((freq) => (
                      <SelectItem key={freq.id} value={freq.id}>
                        {freq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date Received</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="date"
                      className="pl-10 block"
                      value={field.value instanceof Date && !isNaN(field.value.getTime()) ? format(field.value, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const date = e.target.valueAsDate;
                        if (date) {
                          // Adjust for potential timezone offset if needed, but valueAsDate usually returns UTC midnight
                          // A safer bet for local dates is to just parse the string 'YYYY-MM-DD' manually or use new Date(string + 'T00:00:00')
                          // Actually, standard new Date(e.target.value) works in most browsers as UTC, which might show previous day
                          // date-fns parseISO is best, or just manual split
                          const [year, month, day] = e.target.value.split('-').map(Number);
                          const localDate = new Date(year, month - 1, day);
                          field.onChange(localDate);
                        } else {
                          // handle clear if needed, or just ignore
                        }
                      }}
                    />
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={disabled}>
          {mode === 'add' ? <PlusCircle className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          {mode === 'add' ? 'Add Income' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );

  if (isDialog) {
    return formContent;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline flex items-center">
          <DollarSign className="h-6 w-6 mr-2 text-primary" />
          Add Additional Income
        </CardTitle>
        <CardDescription>Log any extra or non-recurring income (e.g., bonus, freelance, 5th weekly pay).</CardDescription>
      </CardHeader>
      <CardContent>
        {formContent}
      </CardContent>
    </Card>
  );
}
