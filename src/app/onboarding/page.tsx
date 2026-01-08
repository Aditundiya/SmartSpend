'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import OnboardingLayout from '@/components/Onboarding/OnboardingLayout';
import Step1_Welcome from '@/components/Onboarding/Step1_Welcome';
import Step2_ProfileSetup from '@/components/Onboarding/Step2_ProfileSetup';
import Step3_Completion from '@/components/Onboarding/Step3_Completion';

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const { user, isLoading } = useAuth();
    const { currentProfile } = useProfile();
    const router = useRouter();

    // If user is already onboarded, redirect to dashboard
    useEffect(() => {
        if (!isLoading && user && currentProfile?.hasCompletedOnboarding) {
            router.push('/');
        }
    }, [isLoading, user, currentProfile, router]);

    // If not logged in, redirect to login
    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [isLoading, user, router]);

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return null; // Will redirect
    }

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const steps = [
        {
            title: "Welcome to SmartSpend",
            description: "Let's get you set up in less than a minute.",
            component: <Step1_Welcome onNext={nextStep} />
        },
        {
            title: "Profile Setup",
            description: "How should we address you?",
            component: <Step2_ProfileSetup onNext={nextStep} onBack={prevStep} />
        },
        {
            title: "All Set!",
            description: "You're ready to start tracking.",
            component: <Step3_Completion onBack={prevStep} />
        }
    ];

    const currentStepData = steps[currentStep - 1];

    return (
        <OnboardingLayout
            currentStep={currentStep}
            totalSteps={3}
            title={currentStepData.title}
            description={currentStepData.description}
        >
            {currentStepData.component}
        </OnboardingLayout>
    );
}
