import { addDays, addWeeks, addMonths, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { addExpenseFS, getExpenses } from '@/lib/firebase';
import type { Expense } from '@/lib/types';
import { logger } from '@/lib/logger';

// Expense frequency types (matching income frequencies)
export const EXPENSE_FREQUENCY_IDS = ['weekly', 'fortnightly', 'monthly', 'one-time'] as const;
export type ExpenseFrequencyId = typeof EXPENSE_FREQUENCY_IDS[number];

export interface RecurringExpenseTemplate {
    id: string;
    profileId: string;
    description: string;
    amount: number;
    categoryId: string;
    frequency: ExpenseFrequencyId;
    startDate: Date;
    endDate?: Date; // Optional end date for the recurring series
    isActive: boolean;
    createdAt: Date;
}

const RECURRING_EXPENSE_STORAGE_KEY = 'smartspend_recurring_expenses';

// Get all recurring expense templates from localStorage
export function getRecurringExpenseTemplates(): RecurringExpenseTemplate[] {
    try {
        const stored = localStorage.getItem(RECURRING_EXPENSE_STORAGE_KEY);
        if (!stored) return [];

        const templates = JSON.parse(stored);
        return templates.map((template: any) => ({
            ...template,
            startDate: new Date(template.startDate),
            endDate: template.endDate ? new Date(template.endDate) : undefined,
            createdAt: new Date(template.createdAt),
        }));
    } catch (error) {
        console.error('Error loading recurring expense templates:', error);
        return [];
    }
}

// Save recurring expense templates to localStorage
export function saveRecurringExpenseTemplates(templates: RecurringExpenseTemplate[]): void {
    try {
        localStorage.setItem(RECURRING_EXPENSE_STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
        console.error('Error saving recurring expense templates:', error);
    }
}

// Add a new recurring expense template
export function addRecurringExpenseTemplate(
    profileId: string,
    description: string,
    amount: number,
    categoryId: string,
    frequency: ExpenseFrequencyId,
    startDate: Date,
    endDate?: Date
): string {
    const templates = getRecurringExpenseTemplates();
    const newTemplate: RecurringExpenseTemplate = {
        id: `recurring_expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        profileId,
        description,
        amount,
        categoryId,
        frequency,
        startDate: startOfDay(startDate),
        endDate: endDate ? startOfDay(endDate) : undefined,
        isActive: true,
        createdAt: new Date(),
    };

    templates.push(newTemplate);
    saveRecurringExpenseTemplates(templates);

    logger.info('Added recurring expense template', { templateId: newTemplate.id, profileId, frequency });
    return newTemplate.id;
}

// Update an existing recurring expense template
export function updateRecurringExpenseTemplate(
    templateId: string,
    updates: Partial<Omit<RecurringExpenseTemplate, 'id' | 'createdAt'>>
): void {
    const templates = getRecurringExpenseTemplates();
    const index = templates.findIndex(t => t.id === templateId);

    if (index !== -1) {
        templates[index] = {
            ...templates[index],
            ...updates,
            startDate: updates.startDate ? startOfDay(updates.startDate) : templates[index].startDate,
            endDate: updates.endDate ? startOfDay(updates.endDate) : templates[index].endDate,
        };
        saveRecurringExpenseTemplates(templates);
        logger.info('Updated recurring expense template', { templateId });
    }
}

// Calculate next occurrence date based on frequency
function getNextOccurrenceDate(lastDate: Date, frequency: ExpenseFrequencyId): Date {
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

// Generate expense records for a specific template up to a target date
export async function generateExpenseRecordsForTemplate(
    template: RecurringExpenseTemplate,
    targetDate: Date = new Date()
): Promise<void> {
    if (!template.isActive || template.frequency === 'one-time') {
        return;
    }

    try {
        // Get existing expense records for this profile to avoid duplicates
        const existingExpenses = await getExpenses(template.profileId);
        const existingDates = new Set(
            existingExpenses
                .filter(expense =>
                    expense.description === template.description &&
                    expense.amount === template.amount &&
                    expense.categoryId === template.categoryId
                )
                .map(expense => startOfDay(expense.date).getTime())
        );

        const recordsToCreate: Omit<Expense, 'id'>[] = [];
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
                    categoryId: template.categoryId,
                    date: new Date(currentDate),
                });
            }

            // Move to next occurrence
            currentDate = getNextOccurrenceDate(currentDate, template.frequency);
        }

        // Create the expense records
        for (const record of recordsToCreate) {
            await addExpenseFS(template.profileId, record);
            logger.info('Generated recurring expense record', {
                templateId: template.id,
                date: record.date,
                amount: record.amount
            });
        }

        if (recordsToCreate.length > 0) {
            logger.info(`Generated ${recordsToCreate.length} recurring expense records for template ${template.id}`);
        }
    } catch (error) {
        logger.error('Error generating expense records for template', error instanceof Error ? error : new Error(String(error)), { templateId: template.id });
        throw error;
    }
}

// Generate all pending recurring expense records for all active templates
export async function generateAllPendingExpenseRecords(profileId?: string): Promise<void> {
    const templates = getRecurringExpenseTemplates();
    const activeTemplates = templates.filter(t =>
        t.isActive &&
        t.frequency !== 'one-time' &&
        (!profileId || t.profileId === profileId)
    );

    logger.info(`Processing ${activeTemplates.length} active recurring expense templates`);

    for (const template of activeTemplates) {
        try {
            await generateExpenseRecordsForTemplate(template);
        } catch (error) {
            logger.error('Failed to generate records for template', error instanceof Error ? error : new Error(String(error)), { templateId: template.id });
        }
    }
}

// Deactivate a recurring expense template
export function deactivateRecurringExpenseTemplate(templateId: string): void {
    const templates = getRecurringExpenseTemplates();
    const template = templates.find(t => t.id === templateId);

    if (template) {
        template.isActive = false;
        saveRecurringExpenseTemplates(templates);
        logger.info('Deactivated recurring expense template', { templateId });
    }
}

// Delete a recurring expense template
export function deleteRecurringExpenseTemplate(templateId: string): void {
    const templates = getRecurringExpenseTemplates();
    const filteredTemplates = templates.filter(t => t.id !== templateId);
    saveRecurringExpenseTemplates(filteredTemplates);
    logger.info('Deleted recurring expense template', { templateId });
}

// Get active recurring expense templates for a profile
export function getActiveRecurringExpenseTemplates(profileId: string): RecurringExpenseTemplate[] {
    return getRecurringExpenseTemplates().filter(t =>
        t.profileId === profileId &&
        t.isActive &&
        t.frequency !== 'one-time'
    );
}

// Get all recurring expense templates for a profile (including inactive)
export function getAllRecurringExpenseTemplates(profileId: string): RecurringExpenseTemplate[] {
    return getRecurringExpenseTemplates().filter(t => t.profileId === profileId);
}

// Calculate total monthly recurring expenses for a profile
export function calculateMonthlyRecurringExpenses(profileId: string): number {
    const templates = getActiveRecurringExpenseTemplates(profileId);
    let total = 0;

    templates.forEach(template => {
        switch (template.frequency) {
            case 'weekly':
                total += template.amount * 4.33; // Average weeks per month
                break;
            case 'fortnightly':
                total += template.amount * 2.17; // Average fortnights per month
                break;
            case 'monthly':
                total += template.amount;
                break;
        }
    });

    return total;
}
