'use client';

import { Button } from '@/components/ui/button';
import { Sparkles, Users, ArrowRight } from 'lucide-react';

interface Step1WelcomeProps {
    onNext: () => void;
}

export default function Step1_Welcome({ onNext }: Step1WelcomeProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 text-center">
                    <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-medium text-sm">Multi-User</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Track shared and personal expenses in one place
                    </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/20 text-center">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                    <h3 className="font-medium text-sm">AI Insights</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Get personalized spending analysis and heavy lifting
                    </p>
                </div>
            </div>

            <div className="text-center space-y-4">
                <h3 className="text-lg font-medium">Why SmartSpend?</h3>
                <ul className="text-left text-sm space-y-3 pl-4">
                    <li className="flex items-start gap-2">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>View other profiles in read-only mode to stay in sync</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>Strict data ownership - no accidental deletions</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>Recurring expenses and incomes tracked automatically</span>
                    </li>
                </ul>
            </div>

            <Button onClick={onNext} className="w-full h-12 text-lg group">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
        </div>
    );
}
