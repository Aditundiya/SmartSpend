import * as z from 'zod';
import { INCOME_FREQUENCY_IDS } from '@/lib/types';

// Common validation rules
const positiveNumber = z.coerce.number().positive('Amount must be positive');
const nonEmptyString = (fieldName: string) =>
  z.string().min(1, `${fieldName} is required`).trim();
const email = z.string().email('Please enter a valid email address');
const password = z.string().min(6, 'Password must be at least 6 characters long');

// Authentication validation schemas
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z.object({
  email,
  password,
  displayName: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  email,
});

// Expense validation schema
export const expenseFormSchema = z.object({
  description: nonEmptyString('Description')
    .max(100, 'Description must be less than 100 characters'),
  amount: positiveNumber.max(999999.99, 'Amount must be less than $1,000,000'),
  categoryId: nonEmptyString('Category'),
  date: z.date({
    required_error: 'Date is required',
    invalid_type_error: 'Please select a valid date'
  })
    .refine((date) => date <= new Date(), {
      message: "Date cannot be in the future"
    }),
  profileId: nonEmptyString('Profile'),
  frequency: z.enum([...INCOME_FREQUENCY_IDS], {
    errorMap: () => ({ message: 'Please select a valid frequency' })
  }).optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

// Income validation schema
export const incomeFormSchema = z.object({
  description: nonEmptyString('Description')
    .max(100, 'Description must be less than 100 characters'),
  amount: positiveNumber.max(999999.99, 'Amount must be less than $1,000,000'),
  frequency: z.enum([...INCOME_FREQUENCY_IDS], {
    required_error: 'Frequency is required',
  }),
  date: z.date({
    required_error: 'Date is required',
    invalid_type_error: 'Please select a valid date'
  })
    .refine((date) => date <= new Date(), {
      message: "Date cannot be in the future"
    }),
});

export type IncomeFormValues = z.infer<typeof incomeFormSchema>;

// Budget validation schema (for future use)
export const budgetSchema = z.object({
  categoryId: nonEmptyString('Category'),
  amount: positiveNumber.max(999999.99, 'Budget must be less than $1,000,000'),
  period: z.enum(['monthly', 'weekly', 'yearly'], {
    required_error: 'Budget period is required',
  }),
  profileId: nonEmptyString('Profile'),
});

export type BudgetFormValues = z.infer<typeof budgetSchema>;

// Profile validation schema (for future use)
export const profileSchema = z.object({
  name: nonEmptyString('Profile name')
    .max(50, 'Name must be less than 50 characters')
    .refine((name) => name.length >= 2, {
      message: "Name must be at least 2 characters long"
    }),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// Search/Filter validation schema
export const searchFilterSchema = z.object({
  query: z.string().optional(),
  categoryId: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
}).refine((data) => {
  // If both dateFrom and dateTo are provided, ensure dateFrom is before dateTo
  if (data.dateFrom && data.dateTo) {
    return data.dateFrom <= data.dateTo;
  }
  return true;
}, {
  message: "Start date must be before end date",
  path: ["dateTo"],
}).refine((data) => {
  // If both minAmount and maxAmount are provided, ensure minAmount is less than maxAmount
  if (data.minAmount !== undefined && data.maxAmount !== undefined) {
    return data.minAmount <= data.maxAmount;
  }
  return true;
}, {
  message: "Minimum amount must be less than maximum amount",
  path: ["maxAmount"],
});

export type SearchFilterValues = z.infer<typeof searchFilterSchema>;

// Validation helper functions
export const validateFormData = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
};

export const getFieldError = (errors: z.ZodError, fieldName: string): string | undefined => {
  const fieldError = errors.errors.find(error =>
    error.path.length > 0 && error.path[0] === fieldName
  );
  return fieldError?.message;
};

export const formatZodErrors = (errors: z.ZodError): Record<string, string> => {
  return errors.errors.reduce((acc, error) => {
    const path = error.path.join('.');
    if (!acc[path]) {
      acc[path] = error.message;
    }
    return acc;
  }, {} as Record<string, string>);
};
