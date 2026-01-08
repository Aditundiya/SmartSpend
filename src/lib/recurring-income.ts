import { addDays, addWeeks, addMonths, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { addIncomeFS, getIncomes } from '@/lib/firebase';
import type { Income, IncomeFrequencyId } from '@/lib/types';
import { logger } from '@/lib/logger';

export interface RecurringIncomeTemplate {
  id: string;
  profileId: string;
  description: string;
  amount: number;
  frequency: IncomeFrequencyId;
  startDate: Date;
  endDate?: Date; // Optional end date for the recurring series
  isActive: boolean;
  createdAt: Date;
}

const RECURRING_INCOME_STORAGE_KEY = 'smartspend_recurring_incomes';

// Get all recurring income templates from localStorage
export function getRecurringIncomeTemplates(): RecurringIncomeTemplate[] {
  try {
    const stored = localStorage.getItem(RECURRING_INCOME_STORAGE_KEY);
    if (!stored) return [];

    const templates = JSON.parse(stored);
    return templates.map((template: any) => ({
      ...template,
      startDate: new Date(template.startDate),
      endDate: template.endDate ? new Date(template.endDate) : undefined,
      createdAt: new Date(template.createdAt),
    }));
  } catch (error) {
    console.error('Error loading recurring income templates:', error);
    return [];
  }
}

// Save recurring income templates to localStorage
export function saveRecurringIncomeTemplates(templates: RecurringIncomeTemplate[]): void {
  try {
    localStorage.setItem(RECURRING_INCOME_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Error saving recurring income templates:', error);
  }
}

// Add a new recurring income template
export function addRecurringIncomeTemplate(
  profileId: string,
  description: string,
  amount: number,
  frequency: IncomeFrequencyId,
  startDate: Date,
  endDate?: Date
): string {
  const templates = getRecurringIncomeTemplates();
  const newTemplate: RecurringIncomeTemplate = {
    id: `recurring_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    profileId,
    description,
    amount,
    frequency,
    startDate: startOfDay(startDate),
    endDate: endDate ? startOfDay(endDate) : undefined,
    isActive: true,
    createdAt: new Date(),
  };

  templates.push(newTemplate);
  saveRecurringIncomeTemplates(templates);

  logger.info('Added recurring income template', { templateId: newTemplate.id, profileId, frequency });
  return newTemplate.id;
}

// Calculate next occurrence date based on frequency
function getNextOccurrenceDate(lastDate: Date, frequency: IncomeFrequencyId): Date {
  switch (frequency) {
    case 'weekly':
      return addWeeks(lastDate, 1);
    case 'fortnightly':
      return addWeeks(lastDate, 2);
    case 'monthly':
      return addMonths(lastDate, 1);
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
}

// Generate income records for a specific template up to a target date
export async function generateIncomeRecordsForTemplate(
  template: RecurringIncomeTemplate,
  targetDate: Date = new Date()
): Promise<void> {
  if (!template.isActive || template.frequency === 'one-time') {
    return;
  }

  try {
    // Get existing income records for this profile to avoid duplicates
    const existingIncomes = await getIncomes(template.profileId);
    const existingDates = new Set(
      existingIncomes
        .filter(income =>
          income.description === template.description &&
          income.amount === template.amount
        )
        .map(income => startOfDay(income.date).getTime())
    );

    const recordsToCreate: Omit<Income, 'id'>[] = [];
    let currentDate = new Date(template.startDate);

    // Generate records from start date to target date
    while (isBefore(currentDate, targetDate) || currentDate.getTime() === startOfDay(targetDate).getTime()) {
      // Check if we've reached the end date
      if (template.endDate && isAfter(currentDate, template.endDate)) {
        break;
      }

      // Check if this date already has a record
      const dateKey = startOfDay(currentDate).getTime();
      if (!existingDates.has(dateKey)) {
        recordsToCreate.push({
          profileId: template.profileId,
          description: template.description,
          amount: template.amount,
          date: new Date(currentDate),
          frequency: template.frequency,
        });
      }

      // Move to next occurrence
      currentDate = getNextOccurrenceDate(currentDate, template.frequency);
    }

    // Create the income records
    for (const record of recordsToCreate) {
      await addIncomeFS(template.profileId, record);
      logger.info('Generated recurring income record', {
        templateId: template.id,
        date: record.date,
        amount: record.amount
      });
    }

    if (recordsToCreate.length > 0) {
      logger.info(`Generated ${recordsToCreate.length} recurring income records for template ${template.id}`);
    }
  } catch (error) {
    logger.error('Error generating income records for template', error instanceof Error ? error : new Error(String(error)), { templateId: template.id });
    throw error;
  }
}

// Generate all pending recurring income records for all active templates
export async function generateAllPendingIncomeRecords(profileId?: string): Promise<void> {
  const templates = getRecurringIncomeTemplates();
  const activeTemplates = templates.filter(t =>
    t.isActive &&
    t.frequency !== 'one-time' &&
    (!profileId || t.profileId === profileId)
  );

  logger.info(`Processing ${activeTemplates.length} active recurring income templates`);

  for (const template of activeTemplates) {
    try {
      await generateIncomeRecordsForTemplate(template);
    } catch (error) {
      logger.error('Failed to generate records for template', error instanceof Error ? error : new Error(String(error)), { templateId: template.id });
    }
  }
}

// Deactivate a recurring income template
export function deactivateRecurringIncomeTemplate(templateId: string): void {
  const templates = getRecurringIncomeTemplates();
  const template = templates.find(t => t.id === templateId);

  if (template) {
    template.isActive = false;
    saveRecurringIncomeTemplates(templates);
    logger.info('Deactivated recurring income template', { templateId });
  }
}

// Get active recurring income templates for a profile
export function getActiveRecurringIncomeTemplates(profileId: string): RecurringIncomeTemplate[] {
  return getRecurringIncomeTemplates().filter(t =>
    t.profileId === profileId &&
    t.isActive &&
    t.frequency !== 'one-time'
  );
}