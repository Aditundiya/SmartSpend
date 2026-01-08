'use client';

import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface OnboardingLayoutProps {
    children: ReactNode;
    currentStep: number;
    totalSteps: number;
    title: string;
    description: string;
}

export default function OnboardingLayout({
    children,
    currentStep,
    totalSteps,
    title,
    description,
}: OnboardingLayoutProps) {
    const progress = (currentStep / totalSteps) * 100;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-lg shadow-lg">
                <div className="p-6 pb-0">
                    <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                        <span>Step {currentStep} of {totalSteps}</span>
                        <span>{Math.round(progress)}% Complete</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
                <div className="p-6">
                    <h1 className="text-2xl font-bold mb-2 text-center">{title}</h1>
                    <p className="text-center text-muted-foreground mb-8">{description}</p>
                    <CardContent className="p-0">
                        {children}
                    </CardContent>
                </div>
            </Card>
        </div>
    );
}
