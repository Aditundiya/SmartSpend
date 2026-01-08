
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading } = useAuth();
  const { currentProfile, loading: profileLoading } = useProfile();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace('/login');
      return;
    }

    // Check if user needs onboarding
    if (!isLoading && isLoggedIn && !profileLoading && pathname !== '/onboarding') {
      // If no profile, redirect to onboarding.
      // For existing users who might lack the 'hasCompletedOnboarding' flag but have a name,
      // we allow them through to prevent blocking valid accounts.
      // New users won't have a profile yet (or won't have a name until Step 2), so they will be correctly redirected.
      const isLegacyUser = currentProfile?.name;
      const needsOnboarding = !currentProfile || (currentProfile.hasCompletedOnboarding === false) || (!currentProfile.hasCompletedOnboarding && !isLegacyUser);

      if (needsOnboarding) {
        // Double check we aren't already there to prevent loops (handled by pathname check above, but safe to be sure)
        router.replace('/onboarding');
      }
    }
  }, [isLoading, isLoggedIn, router, profileLoading, currentProfile, pathname]);

  if (isLoading || !isLoggedIn || (profileLoading && isLoggedIn)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
