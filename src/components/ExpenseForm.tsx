
'use client';

import type { Category, Profile } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, PlusCircle, Save, Users, RefreshCw } from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { PERSONS, INCOME_FREQUENCIES_CONFIG } from '@/data/constants';
import { expenseFormSchema, type ExpenseFormValues } from '@/lib/validations';

interface ExpenseFormProps {
  categories: Category[];
  profiles: Profile[]; // Pass available profiles
  onFormSubmit: (data: ExpenseFormValues, editingId?: string) => Promise<void>;
  defaultDate: Date;
  initialValues?: ExpenseFormValues & { id?: string }; // initialValues should include profileId for edit
  mode: 'add' | 'edit';
  currentProfileIdForAddMode?: string; // Used to set default profileId in add mode
  disabled?: boolean;
}

export default function ExpenseForm({
  categories,
  profiles,
  onFormSubmit,
  defaultDate,
  initialValues,
  mode,
  currentProfileIdForAddMode,
  disabled = false
}: ExpenseFormProps) {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: '',
      amount: '' as any,
      categoryId: '',
      date: startOfMonth(defaultDate),
      profileId: mode === 'add' ? currentProfileIdForAddMode || (PERSONS.length > 0 ? PERSONS[0].id : '') : '',
      frequency: 'one-time',
    },
  });

  useEffect(() => {
    if (mode === 'edit' && initialValues) {
      form.reset({
        description: initialValues.description,
        amount: initialValues.amount,
        categoryId: initialValues.categoryId,
        date: initialValues.date,
        profileId: initialValues.profileId,
        frequency: initialValues.frequency || 'one-time',
      });
    } else if (mode === 'add') {
      form.reset({
        description: '',
        amount: '' as any,
        categoryId: '',
        date: startOfMonth(defaultDate),
        profileId: currentProfileIdForAddMode || (PERSONS.length > 0 ? PERSONS[0].id : ''),
        frequency: 'one-time',
      });
    }
  }, [mode, initialValues, form, defaultDate, currentProfileIdForAddMode]);

  useEffect(() => {
    if (disabled) {
      form.reset({
        description: '',
        amount: '' as any,
        categoryId: '',
        date: startOfMonth(defaultDate),
        profileId: mode === 'add' ? currentProfileIdForAddMode || (PERSONS.length > 0 ? PERSONS[0].id : '') : initialValues?.profileId || '',
      });
    }
  }, [disabled, form, defaultDate, mode, currentProfileIdForAddMode, initialValues]);


  async function onSubmit(data: ExpenseFormValues) {
    // The 'data' object now includes profileId from the form's state.
    // For "add" mode, this profileId was defaulted from currentProfileIdForAddMode.
    // For "edit" mode, it's whatever the user selected in the form.
    await onFormSubmit(data, mode === 'edit' ? initialValues?.id : undefined);
    if (mode === 'add') {
      form.reset({
        description: '',
        amount: '' as any,
        categoryId: '',
        date: startOfMonth(defaultDate),
        profileId: currentProfileIdForAddMode || (PERSONS.length > 0 ? PERSONS[0].id : ''),
        frequency: 'one-time',
      });
    }
  }

  const calendarDefaultMonth = mode === 'edit' && initialValues ? initialValues.date : defaultDate;

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          // Prevent accidental submission if the user clicked something that didn't have type="submit"
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
          {mode === 'edit' && (
            <FormField
              control={form.control}
              name="profileId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a profile" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" /> {/* Example Icon */}
                            {profile.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Coffee with friends" {...field} />
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
                  <Input type="number" step="0.01" placeholder="e.g., 15.50" {...field} value={field.value === undefined || field.value === null ? '' : String(field.value)} onChange={e => field.onChange(parseFloat(e.target.value) || '')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center">
                          <category.icon className="h-4 w-4 mr-2" />
                          {category.name}
                        </div>
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
                        <div className="flex items-center">
                          {freq.id !== 'one-time' && <RefreshCw className="h-4 w-4 mr-2" />}
                          {freq.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
                {field.value && field.value !== 'one-time' && (
                  <p className="text-xs text-muted-foreground">
                    This expense will automatically repeat {field.value}.
                  </p>
                )}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        defaultMonth={calendarDefaultMonth}
                        disabled={(d) => d < new Date('2000-01-01')}
                        initialFocus
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={disabled}>
          {mode === 'add' ? <PlusCircle className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          {mode === 'add' ? 'Add Expense' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
}
