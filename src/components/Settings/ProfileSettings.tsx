'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { updateProfile } from '@/lib/profile-actions';
import { Loader2, User } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function ProfileSettings() {
    const { user } = useAuth();
    const { currentProfile, loading } = useProfile();
    const [name, setName] = useState(currentProfile?.name || '');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim()) return;

        setIsSaving(true);
        try {
            await updateProfile(user.uid, {
                name: name.trim(),
                updatedAt: new Date()
            });

            toast({
                title: "Profile Updated",
                description: "Your display name has been updated successfully.",
                className: "bg-accent text-accent-foreground"
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update profile. Please try again.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Settings
                </CardTitle>
                <CardDescription>
                    Manage your personal information and how you appear to others.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                            id="displayName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your Name"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            value={user?.email || ''}
                            disabled={true}
                            className="bg-muted text-muted-foreground"
                        />
                        <p className="text-xs text-muted-foreground"> Email cannot be changed.</p>
                    </div>
                </form>
            </CardContent>
            <CardFooter className="flex justify-end border-t p-4 bg-muted/20">
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !name.trim() || name === currentProfile?.name}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Save Changes'
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
