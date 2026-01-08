import type { Category, Profile, RecurringIncomeEntry, IncomeFrequencyId } from '@/lib/types';
import { Home, ShoppingCart, FileText, Zap, Car, Film, HelpCircle, Briefcase, Utensils, Shirt } from 'lucide-react';

export const CATEGORIES: Category[] = [
  { id: 'grocery', name: 'Groceries', icon: ShoppingCart },
  { id: 'bills', name: 'Bills', icon: FileText },
  { id: 'utilities', name: 'Utilities', icon: Zap },
  { id: 'transport', name: 'Transport', icon: Car },
  { id: 'home', name: 'Home', icon: Home },
  { id: 'entertainment', name: 'Entertainment', icon: Film },
  { id: 'food', name: 'Dining Out', icon: Utensils },
  { id: 'clothing', name: 'Clothing', icon: Shirt },
  { id: 'work', name: 'Work', icon: Briefcase },
  { id: 'other', name: 'Other', icon: HelpCircle },
];

export const CATEGORY_COLORS = {
  // Fresh green for groceries (healthy, natural)
  grocery: '#10B981', // Emerald

  // Urgent red for bills (important, attention-grabbing)
  bills: '#EF4444', // Red

  // Electric blue for utilities (power, essential services)
  utilities: '#3B82F6', // Blue

  // Purple for transport (movement, travel)
  transport: '#8B5CF6', // Violet

  // Warm orange for home (comfort, warmth)
  home: '#F97316', // Orange

  // Magenta for entertainment (fun, excitement)
  entertainment: '#EC4899', // Pink

  // Golden yellow for dining (appetite, indulgence)
  food: '#F59E0B', // Amber

  // Teal for clothing (fashion, style)
  clothing: '#06B6D4', // Cyan

  // Indigo for work (professional, business)
  work: '#6366F1', // Indigo

  // Neutral gray for other (miscellaneous)
  other: '#6B7280', // Gray
};

export const INCOME_FREQUENCIES_CONFIG = [
  { id: 'weekly' as IncomeFrequencyId, name: 'Weekly', occurrencesPerMonth: 4 },
  { id: 'fortnightly' as IncomeFrequencyId, name: 'Fortnightly', occurrencesPerMonth: 2 },
  { id: 'monthly' as IncomeFrequencyId, name: 'Monthly', occurrencesPerMonth: 1 },
  { id: 'one-time' as IncomeFrequencyId, name: 'One-time', occurrencesPerMonth: 0 }, // For manual logs, 0 for recurring calc
] as const;


export const PERSONS: Profile[] = [
  // Demo profiles removed for V1.
  // { id: 'person1', name: 'Adi' },
  // { id: 'person2', name: 'Twinky' },
] as const;

// This configuration defines recurring incomes like salaries or wages.
// The app automatically calculates the monthly total from these entries.
// They are NOT stored as individual records in the database.
// To log one-off payments (e.g., a bonus), use the "Add Additional Income" form on the dashboard.
export const RECURRING_INCOMES_CONFIG: RecurringIncomeEntry[] = [];
