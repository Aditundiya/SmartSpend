
import type { LucideIcon } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  date: Date;
  profileId: string;
}

export const INCOME_FREQUENCY_IDS = ['weekly', 'fortnightly', 'monthly', 'one-time'] as const;
export type IncomeFrequencyId = typeof INCOME_FREQUENCY_IDS[number];

export interface Income {
  id: string;
  description: string;
  amount: number;
  frequency: IncomeFrequencyId;
  date: Date;
  profileId: string; // Added to associate income with a profile for manual logs
}

// Used by IncomeForm component
export type IncomeFormValues = Omit<Income, 'id' | 'profileId'>;


export interface SpendingByCategory {
  name: string;
  total: number;
  fill: string;
}

export interface Profile {
  id: string;
  name: string;
  hasCompletedOnboarding?: boolean;
  partnerUid?: string; // UID of the connected partner
  preferences?: {
    currency?: string;
    dateFormat?: string;
  };
}

export interface RecurringIncomeEntry {
  profileId: string;
  description: string;
  amount: number;
  // For recurring, only these make sense for automated calculation. 'one-time' is for manual logs.
  frequencyId: Extract<IncomeFrequencyId, 'weekly' | 'fortnightly' | 'monthly'>;
}
