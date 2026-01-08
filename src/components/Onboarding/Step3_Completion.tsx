'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, PartyPopper } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, PROFILES_COLLECTION } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileContext';

interface Step3CompletionProps {
    onBack: () => void;
}



export default function Step3_Completion({ onBack }: Step3CompletionProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [addSampleData, setAddSampleData] = useState(true);

    const handleFinish = async () => {
        if (!user) return;

        setIsSubmitting(true);
        try {
            // 1. Mark onboarding as complete
            const profileRef = doc(db, PROFILES_COLLECTION, user.uid);
            await updateDoc(profileRef, {
                hasCompletedOnboarding: true,
                completedOnboardingAt: new Date()
            });

            // 2. Add sample data if requested (optional future implementation)
            // For now we just skip this as we haven't built the sample data generator yet
            if (addSampleData) {
                console.log("Sample data requested - pending implementation");
            }

            // 3. Refresh profile state in context
            const { refreshProfile } = useProfile(); // We need to handle this differently if we can't use hook here
            // Wait, handleFinish is inside component, so we can use useProfile there.

            // 4. Redirect to dashboard
            router.push('/');
            router.refresh();
        } catch (error) {
            console.error('Error completing onboarding:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 text-center">
            <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                    <PartyPopper className="h-8 w-8 text-green-600" />
                </div>
            </div>

            <div className="space-y-2">
                <h2 className="text-xl font-semibold">You're all set!</h2>
                <p className="text-sm text-muted-foreground">
                    Your profile is ready. You can now start tracking your expenses and incomes.
                </p>
            </div>

            <div className="flex items-center space-x-2 border p-4 rounded-lg text-left bg-muted/20">
                <Checkbox
                    id="sampleData"
                    checked={addSampleData}
                    onCheckedChange={(c) => setAddSampleData(!!c)}
                />
                <Label htmlFor="sampleData" className="text-sm font-normal cursor-pointer">
                    Add sample categories and expenses to help me get started
                </Label>
            </div>

            <div className="flex gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onBack}
                    disabled={isSubmitting}
                    className="flex-1"
                >
                    Back
                </Button>
                <Button
                    onClick={handleFinish}
                    className="flex-1"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Finishing...
                        </>
                    ) : (
                        'Go to Dashboard'
                    )}
                </Button>
            </div>
        </div>
    );
}
