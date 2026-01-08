'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, PROFILES_COLLECTION } from '@/lib/firebase';

interface Step2ProfileSetupProps {
    onNext: () => void;
    onBack: () => void;
}

export default function Step2_ProfileSetup({ onNext, onBack }: Step2ProfileSetupProps) {
    const { user } = useAuth();
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim() || !user) return;

        setIsSubmitting(true);
        try {
            // Check if profile exists first
            const profileRef = doc(db, PROFILES_COLLECTION, user.uid);
            const profileSnap = await getDoc(profileRef);

            if (profileSnap.exists()) {
                await updateDoc(profileRef, {
                    name: displayName.trim(),
                    email: user.email,
                    updatedAt: new Date()
                });
            } else {
                // Create new profile if it doesn't exist
                await setDoc(profileRef, {
                    id: user.uid,
                    name: displayName.trim(),
                    email: user.email,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            }

            onNext();
        } catch (error) {
            console.error('Error updating profile:', error);
            // In a real app, show error toast
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="displayName">What should we call you?</Label>
                    <Input
                        id="displayName"
                        placeholder="e.g. Alex"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={isSubmitting}
                        autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                        This name will be visible to other family members.
                    </p>
                </div>
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
                    type="submit"
                    className="flex-1"
                    disabled={!displayName.trim() || isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Continue'
                    )}
                </Button>
            </div>
        </form>
    );
}
