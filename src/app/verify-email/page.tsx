'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Mail, RefreshCw, LogOut, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function VerifyEmailPage() {
    const { user, sendVerificationEmail, logout } = useAuth();
    const [isResendDisabled, setIsResendDisabled] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [isChecking, setIsChecking] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    // Effect to handle countdown timer for resend button
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        } else {
            setIsResendDisabled(false);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleResendEmail = async () => {
        setIsResendDisabled(true);
        setCountdown(60); // 60 second cooldown
        try {
            await sendVerificationEmail();
            toast({
                title: "Email Sent",
                description: "A new verification link has been sent to your email.",
            });
        } catch (error) {
            console.error("Error sending verification email:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to send email. Please try again later.",
            });
            setIsResendDisabled(false);
            setCountdown(0);
        }
    };

    const handleCheckVerification = async () => {
        setIsChecking(true);
        try {
            // Reload the user to get the latest emailVerified status
            await user?.reload();
            if (user?.emailVerified) {
                toast({
                    title: "Success!",
                    description: "Your email has been verified. Redirecting...",
                });
                router.push('/');
                router.refresh();
            } else {
                toast({
                    variant: "default",
                    title: "Not Verified Yet",
                    description: "We haven't detected the verification yet. Please check your email and click the link.",
                });
            }
        } catch (error) {
            console.error("Error checking verification:", error);
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <Mail className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Verify your Email</CardTitle>
                    <CardDescription className="text-base mt-2">
                        We've sent a verification link to <br />
                        <span className="font-semibold text-foreground">{user?.email}</span>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                        Please check your inbox and click the link to verify your account.
                        If you don't see it, check your spam folder.
                    </p>

                    <div className="grid gap-3">
                        <Button
                            onClick={handleCheckVerification}
                            disabled={isChecking}
                            className="w-full"
                        >
                            {isChecking ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            I've Clicked the Link
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleResendEmail}
                            disabled={isResendDisabled}
                            className="w-full"
                        >
                            {isResendDisabled ? `Resend in ${countdown}s` : 'Resend Verification Email'}
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="justify-center border-t pt-6 text-sm text-muted-foreground">
                    <p className="flex items-center gap-1">
                        Wrong email?
                        <button
                            onClick={() => logout()}
                            className="text-primary hover:underline font-medium flex items-center"
                        >
                            <LogOut className="h-3 w-3 mr-1 ml-1" /> Sign Out
                        </button>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
