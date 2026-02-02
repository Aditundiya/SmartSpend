'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod'; // Import z from zod directly
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INCOME_FREQUENCIES_CONFIG } from '@/data/constants';
import { Profile } from '@/lib/types';
import { ArrowRight, Check, DollarSign, Home } from 'lucide-react';
import { addIncomeFS, addExpenseFS } from '@/lib/firebase';
import { addRecurringExpenseTemplate, generateExpenseRecordsForTemplate } from '@/lib/recurring-expense';
import { addRecurringIncomeTemplate, generateIncomeRecordsForTemplate } from '@/lib/recurring-income';

// Define schemas locally since they are specific to this wizard flow
const step1Schema = z.object({
    incomeAmount: z.number().min(1, "Income is required"),
    incomeFrequency: z.string().min(1, "Frequency is required"),
});

const step2Schema = z.object({
    hasRent: z.boolean(),
    rentAmount: z.number().optional(),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;

interface OnboardingWizardProps {
    currentProfile: Profile;
    isOpen: boolean;
    onComplete: () => void;
}

export default function OnboardingWizard({ currentProfile, isOpen, onComplete }: OnboardingWizardProps) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step1Data, setStep1Data] = useState<Step1Values | null>(null);

    // Step 1 Form: Income
    const form1 = useForm<Step1Values>({
        resolver: zodResolver(step1Schema),
        defaultValues: {
            incomeAmount: 0,
            incomeFrequency: 'monthly',
        },
    });

    // Step 2 Form: Rent/Mortgage
    const form2 = useForm<Step2Values>({
        resolver: zodResolver(step2Schema),
        defaultValues: {
            hasRent: true,
            rentAmount: 0,
        },
    });

    const onStep1Submit = (data: Step1Values) => {
        setStep1Data(data);
        setStep(2);
    };

    const onStep2Submit = async (data: Step2Values) => {
        if (!step1Data) return;
        setIsSubmitting(true);

        try {
            // 1. Add Recurring Income
            if (step1Data.incomeFrequency === 'one-time') {
                // Add as one-time income for this month
                await addIncomeFS({
                    amount: step1Data.incomeAmount,
                    description: 'Initial Income',
                    date: new Date(),
                    frequency: 'one-time',
                    profileId: currentProfile.id
                });
            } else {
                // Add recurring template
                const templateId = await addRecurringIncomeTemplate(currentProfile.id, {
                    description: 'Salary / Primary Income',
                    amount: step1Data.incomeAmount,
                    frequency: step1Data.incomeFrequency as any,
                    startDate: new Date(),
                });
                // Generate for this month
                await generateIncomeRecordsForTemplate(currentProfile.id, templateId, {
                    id: templateId,
                    description: 'Salary / Primary Income',
                    amount: step1Data.incomeAmount,
                    frequency: step1Data.incomeFrequency as any,
                    startDate: new Date(),
                    active: true
                });
            }

            // 2. Add Rent as Recurring Expense if applicable
            if (data.hasRent && data.rentAmount && data.rentAmount > 0) {
                const templateId = addRecurringExpenseTemplate(currentProfile.id, {
                    description: 'Rent / Mortgage',
                    amount: data.rentAmount,
                    categoryId: 'housing', // Assuming 'housing' exists in constants, usually it does or map to closest
                    frequency: 'monthly',
                    startDate: new Date(),
                });
                generateExpenseRecordsForTemplate(currentProfile.id, templateId, {
                    id: templateId,
                    description: 'Rent / Mortgage',
                    amount: data.rentAmount,
                    categoryId: 'housing',
                    frequency: 'monthly',
                    startDate: new Date(),
                    active: true
                });
            }

            onComplete();
        } catch (error) {
            console.error("Onboarding error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Welcome to SmartSpend, {currentProfile.name}!</DialogTitle>
                    <DialogDescription>
                        Let's get your dashboard set up in 2 quick steps.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {step === 1 && (
                        <Form {...form1}>
                            <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">1</div>
                                    <h3 className="font-semibold">What is your monthly income?</h3>
                                </div>

                                <FormField
                                    control={form1.control}
                                    name="incomeAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estimated Amount ($)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input type="number" className="pl-8" placeholder="e.g. 5000" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form1.control}
                                    name="incomeFrequency"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>How often do you receive this?</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select frequency" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {INCOME_FREQUENCIES_CONFIG.map(freq => (
                                                        <SelectItem key={freq.id} value={freq.id}>{freq.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full mt-4">
                                    Next Step <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </form>
                        </Form>
                    )}

                    {step === 2 && (
                        <Form {...form2}>
                            <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">2</div>
                                    <h3 className="font-semibold">Do you pay Rent or Mortgage?</h3>
                                </div>

                                <FormField
                                    control={form2.control}
                                    name="hasRent"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                {/* Simplified: just ask for amount if they have it, assuming yes for now or 0 if no */}
                                                <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4 mt-1" />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel>
                                                    Yes, I have a fixed housing cost
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                {form2.watch('hasRent') && (
                                    <FormField
                                        control={form2.control}
                                        name="rentAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Monthly Amount ($)</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Home className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                                        <Input type="number" className="pl-8" placeholder="e.g. 1200" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
                                    {isSubmitting ? 'Setting up...' : 'Finish Setup'} <Check className="ml-2 h-4 w-4" />
                                </Button>
                            </form>
                        </Form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
