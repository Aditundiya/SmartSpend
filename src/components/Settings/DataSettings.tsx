'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { getExpenses, getIncomes } from '@/lib/firebase';
import { Loader2, Download, Trash2, Database } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DataSettings() {
    const { user } = useAuth();
    const { currentProfile } = useProfile();
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const handleExport = async () => {
        if (!currentProfile) return;

        setIsExporting(true);
        try {
            // Fetch all historical data
            const [allExpenses, allIncomes] = await Promise.all([
                getExpenses(currentProfile.id),
                getIncomes(currentProfile.id)
            ]);

            const data = {
                profile: {
                    name: currentProfile.name,
                    id: currentProfile.id,
                    exportedAt: new Date().toISOString(),
                },
                expenses: allExpenses,
                incomes: allIncomes,
            };

            // Trigger download
            const now = new Date();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `smartspend-export-${format(now, 'yyyy-MM-dd')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({
                title: "Export Complete",
                description: `Exported ${allExpenses.length} expenses and ${allIncomes.length} incomes.`,
                className: "bg-accent text-accent-foreground"
            });

        } catch (error) {
            console.error("Export failed:", error);
            toast({
                variant: "destructive",
                title: "Export Failed",
                description: "Could not export data. Please try again.",
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleResetData = async () => {
        // Not implementing dangerous deletion yet as it requires complex cascading deletes 
        // and we want to prevent accidents in MVP.
        toast({
            title: "Coming Soon",
            description: "Account reset functionality will be available in a future update.",
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Management
                </CardTitle>
                <CardDescription>
                    Manage your account data.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border rounded-lg">
                    <div className="space-y-1">
                        <h4 className="font-medium">Export Data</h4>
                        <p className="text-sm text-muted-foreground">Download a copy of your personal data, expenses, and incomes.</p>
                    </div>
                    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                        Export JSON
                    </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
                    <div className="space-y-1">
                        <h4 className="font-medium text-destructive">Danger Zone</h4>
                        <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isResetting}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Account
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleResetData}>
                                    Delete Account
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
}
