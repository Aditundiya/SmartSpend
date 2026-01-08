'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';

interface SettingsLayoutProps {
    children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0">
            <AppHeader />
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex items-center mb-6">
                    <Button variant="ghost" size="sm" asChild className="mr-4">
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold">Settings</h1>
                </div>
                <div className="grid gap-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
