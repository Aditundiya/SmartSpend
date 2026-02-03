'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign } from 'lucide-react';
import IncomeForm from '@/components/IncomeForm';
import type { IncomeFormValues } from '@/lib/validations';

interface AddIncomeDialogProps {
    onIncomeAdded: (data: IncomeFormValues) => Promise<void>;
    currentViewingDateForAdd: Date;
    triggerButton?: React.ReactNode;
}

export default function AddIncomeDialog({
    onIncomeAdded,
    currentViewingDateForAdd,
    triggerButton,
}: AddIncomeDialogProps) {
    const [open, setOpen] = useState(false);

    const handleFormSubmit = async (data: IncomeFormValues) => {
        await onIncomeAdded(data);
        setOpen(false); // Close dialog after successful submission
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {triggerButton || (
                    <Button className="w-full" size="lg">
                        <Plus className="h-5 w-5 mr-2" />
                        Add Income
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Add New Income
                    </SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                    <IncomeForm
                        onFormSubmit={handleFormSubmit}
                        currentViewingDateForAdd={currentViewingDateForAdd}
                        mode="add"
                        isDialog={true}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
