'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { linkPartners, unlinkPartners } from '@/lib/profile-actions';
import { Loader2, Users, Link, Unlink, Copy, Check } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function PartnerSettings() {
    const { user } = useAuth();
    const { currentProfile, profiles, refreshProfile } = useProfile();
    const [partnerCode, setPartnerCode] = useState('');
    const [isLinking, setIsLinking] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const { toast } = useToast();

    const partnerProfile = profiles.find(p => p.id === currentProfile?.partnerUid);

    const handleCopyId = () => {
        if (!user) return;
        navigator.clipboard.writeText(user.uid);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast({
            title: "ID Copied",
            description: "Your Connection ID has been copied to clipboard.",
        });
    };

    const handleLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !partnerCode.trim()) return;

        setIsLinking(true);
        try {
            await linkPartners(user.uid, partnerCode.trim());
            await refreshProfile();
            setPartnerCode('');
            toast({
                title: "Partners Linked!",
                description: "You are now connected with your partner.",
            });
        } catch (error: any) {
            console.error('Error linking partners:', error);
            toast({
                variant: "destructive",
                title: "Linking Failed",
                description: error.message || "Could not link accounts. Please verify the ID.",
            });
        } finally {
            setIsLinking(false);
        }
    };

    const handleUnlink = async () => {
        if (!user || !currentProfile?.partnerUid) return;

        setIsLinking(true);
        try {
            await unlinkPartners(user.uid, currentProfile.partnerUid);
            await refreshProfile();
            toast({
                title: "Partners Unlinked",
                description: "Accounts have been disconnected.",
            });
        } catch (error) {
            console.error('Error unlinking partners:', error);
            toast({
                variant: "destructive",
                title: "Unlink Failed",
                description: "Could not disconnect accounts.",
            });
        } finally {
            setIsLinking(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Partner Connection
                </CardTitle>
                <CardDescription>
                    Connect with a partner to see each other's expenses and incomes.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Your Connection ID</Label>
                    <div className="flex gap-2">
                        <Input
                            value={user?.uid || ''}
                            readOnly
                            className="font-mono text-xs bg-muted"
                        />
                        <Button variant="outline" size="icon" onClick={handleCopyId}>
                            {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Share this ID with your partner so they can connect to you.</p>
                </div>

                <div className="pt-4 border-t">
                    {currentProfile?.partnerUid ? (
                        <div className="flex items-center justify-between p-4 bg-accent/20 rounded-lg border border-accent/50">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div className="max-w-[150px] md:max-w-none">
                                    <p className="font-medium truncate">{partnerProfile?.name || 'Linked Partner'}</p>
                                    <p className="text-xs text-muted-foreground">Connected Account</p>
                                </div>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleUnlink}
                                disabled={isLinking}
                            >
                                <Unlink className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Unlink</span>
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleLink} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="partnerId">Partner's Connection ID</Label>
                                <Input
                                    id="partnerId"
                                    value={partnerCode}
                                    onChange={(e) => setPartnerCode(e.target.value)}
                                    placeholder="Paste partner's ID here"
                                    disabled={isLinking}
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLinking || !partnerCode.trim()}
                            >
                                {isLinking ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Linking...
                                    </>
                                ) : (
                                    <>
                                        <Link className="h-4 w-4 mr-2" />
                                        Link Partner
                                    </>
                                )}
                            </Button>
                        </form>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
