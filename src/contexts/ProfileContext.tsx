
'use client';

import type { Profile } from '@/lib/types';
import { PERSONS } from '@/data/constants';
import { useAuth } from '@/contexts/AuthContext';
import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';

interface ProfileContextType {
  currentProfile: Profile | null;
  setCurrentProfileById: (profileId: string) => void;
  refreshProfile: () => Promise<void>;
  profiles: Profile[];
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const LOCAL_STORAGE_PROFILE_KEY = 'smartspend_currentProfileId';

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);

    const loadProfile = async () => {
      try {
        if (!user) {
          setCurrentProfile(null);
          setProfiles([]);
          localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
          setLoading(false);
          return;
        }

        const profileId = user.uid;

        // Fetch from Firestore
        const { doc, getDoc } = await import('firebase/firestore');
        const { db, PROFILES_COLLECTION } = await import('@/lib/firebase');

        const profileRef = doc(db, PROFILES_COLLECTION, profileId);
        const profileSnap = await getDoc(profileRef);

        let activeProfile: Profile;
        let profileList: Profile[] = [];

        if (profileSnap.exists()) {
          // IMPORTANT: Firestore data doesn't include the ID automatically. We must merge it.
          activeProfile = { ...profileSnap.data(), id: profileSnap.id } as Profile;
          profileList.push(activeProfile);

          // If partner exists, fetch partner's profile too
          if (activeProfile.partnerUid) {
            const partnerRef = doc(db, PROFILES_COLLECTION, activeProfile.partnerUid);
            const partnerSnap = await getDoc(partnerRef);
            if (partnerSnap.exists()) {
              profileList.push({ ...partnerSnap.data(), id: partnerSnap.id } as Profile);
            }
          }
        } else {
          const name = user.displayName || user.email?.split('@')[0] || 'User';
          activeProfile = {
            id: profileId,
            name: name,
            hasCompletedOnboarding: false
          };
          profileList.push(activeProfile);
        }

        setCurrentProfile(activeProfile);
        setProfiles(profileList);
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, profileId);

      } catch (error) {
        console.error("Error loading profile:", error);
        if (user) {
          const fallbackProfile = {
            id: user.uid,
            name: user.displayName || 'User',
          };
          setCurrentProfile(fallbackProfile);
          setProfiles([fallbackProfile]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const setCurrentProfileById = useCallback((profileId: string) => {
    setLoading(true);
    const profileToSet = profiles.find(p => p.id === profileId);
    if (profileToSet) {
      setCurrentProfile(profileToSet);
      try {
        localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, profileId);
      } catch (error) {
        console.error("Error saving profile to localStorage:", error);
      }
    }
    setLoading(false);
  }, [profiles]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db, PROFILES_COLLECTION } = await import('@/lib/firebase');
      const profileRef = doc(db, PROFILES_COLLECTION, user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const upToDateProfile = { ...profileSnap.data(), id: profileSnap.id } as Profile;
        const profileList: Profile[] = [upToDateProfile];

        if (upToDateProfile.partnerUid) {
          const partnerRef = doc(db, PROFILES_COLLECTION, upToDateProfile.partnerUid);
          const partnerSnap = await getDoc(partnerRef);
          if (partnerSnap.exists()) {
            profileList.push({ ...partnerSnap.data(), id: partnerSnap.id } as Profile);
          }
        }

        setCurrentProfile(upToDateProfile);
        setProfiles(profileList);
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return (
    <ProfileContext.Provider value={{ currentProfile, setCurrentProfileById, refreshProfile, profiles, loading }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
