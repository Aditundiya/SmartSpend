'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import ExpenseForm from '@/components/ExpenseForm';
import type { ExpenseFormValues } from '@/lib/validations';
import type { Category, Profile } from '@/lib/types';

interface AddExpenseDialogProps {
    categories: Category[];
    profiles: Profile[];
    onExpenseAdded: (data: ExpenseFormValues) => Promise<void>;
    currentProfileId?: string;
    triggerButton?: React.ReactNode;
    defaultDate?: Date;
}

export default function AddExpenseDialog({
    categories,
    profiles,
    onExpenseAdded,
    currentProfileId,
    triggerButton,
    defaultDate = new Date(),
}: AddExpenseDialogProps) {
    const [open, setOpen] = useState(false);

    const handleFormSubmit = async (data: ExpenseFormValues) => {
        await onExpenseAdded(data);
        setOpen(false); // Close dialog after successful submission
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {triggerButton || (
                    <Button className="w-full" size="lg">
                        <Plus className="h-5 w-5 mr-2" />
                        Add Expense
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Add New Expense</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                    <ExpenseForm
                        categories={categories}
                        profiles={profiles}
                        onFormSubmit={handleFormSubmit}
                        defaultDate={defaultDate}
                        mode="add"
                        currentProfileIdForAddMode={currentProfileId}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
