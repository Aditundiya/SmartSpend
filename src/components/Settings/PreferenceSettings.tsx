'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { updateProfile } from '@/lib/profile-actions';
import { Loader2, Globe, Calendar } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from '@/lib/utils'; // Usage of updated util later

const CURRENCIES = [
    { code: 'USD', name: 'US Dollar ($)' },
    { code: 'EUR', name: 'Euro (€)' },
    { code: 'GBP', name: 'British Pound (£)' },
    { code: 'INR', name: 'Indian Rupee (₹)' },
    { code: 'AUD', name: 'Australian Dollar (A$)' },
    { code: 'CAD', name: 'Canadian Dollar (C$)' },
    { code: 'JPY', name: 'Japanese Yen (¥)' },
    { code: 'CNY', name: 'Chinese Yuan (¥)' },
];

const DATE_FORMATS = [
    { value: 'MM/dd/yyyy', label: 'MM/DD/YYYY (12/31/2023)' },
    { value: 'dd/MM/yyyy', label: 'DD/MM/YYYY (31/12/2023)' },
    { value: 'yyyy-MM-dd', label: 'YYYY-MM-DD (2023-12-31)' },
];

export default function PreferenceSettings() {
    const { user } = useAuth();
    const { currentProfile, loading } = useProfile();
    const { toast } = useToast();

    const [currency, setCurrency] = useState('USD');
    const [dateFormat, setDateFormat] = useState('MM/dd/yyyy');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (currentProfile?.preferences) {
            if (currentProfile.preferences.currency) setCurrency(currentProfile.preferences.currency);
            if (currentProfile.preferences.dateFormat) setDateFormat(currentProfile.preferences.dateFormat);
        }
    }, [currentProfile]);

    useEffect(() => {
        if (!currentProfile?.preferences) {
            setHasChanges(true); // Initial save for new users
            return;
        }
        const currentCurr = currentProfile.preferences.currency || 'USD';
        const currentFmt = currentProfile.preferences.dateFormat || 'MM/dd/yyyy';

        setHasChanges(currency !== currentCurr || dateFormat !== currentFmt);
    }, [currency, dateFormat, currentProfile]);

    const handleSave = async () => {
        if (!user) return;

        setIsSaving(true);
        try {
            await updateProfile(user.uid, {
                preferences: {
                    currency,
                    dateFormat
                }
            });

            toast({
                title: "Preferences Saved",
                description: "Your app preferences have been updated.",
                className: "bg-accent text-accent-foreground"
            });

            setHasChanges(false);

            // Force reload to apply currency changes globally if context doesn't auto-propagate deep enough
            // Ideally context handles it, but currency requires deep plumbing.
            // For now, let's trust the components will re-render if they read from profile.
            // If we used a window.reload() it might be jarring but effective. 
            // Let's stick to state updates.
            if (typeof window !== 'undefined') {
                // Dispatch a custom event for immediate UI updates if needed
                window.dispatchEvent(new Event('storage'));
            }

        } catch (error) {
            console.error('Error updating preferences:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to save preferences. Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    App Preferences
                </CardTitle>
                <CardDescription>
                    Customize your experience with currency and formatting options.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={currency} onValueChange={setCurrency}>
                            <SelectTrigger id="currency">
                                <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                            <SelectContent>
                                {CURRENCIES.map((c) => (
                                    <SelectItem key={c.code} value={c.code}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dateFormat">Date Format</Label>
                        <Select value={dateFormat} onValueChange={setDateFormat}>
                            <SelectTrigger id="dateFormat">
                                <SelectValue placeholder="Select date format" />
                            </SelectTrigger>
                            <SelectContent>
                                {DATE_FORMATS.map((f) => (
                                    <SelectItem key={f.value} value={f.value}>
                                        {f.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t p-4 bg-muted/20">
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Save Preferences'
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
