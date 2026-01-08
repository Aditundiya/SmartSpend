'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import SettingsLayout from '@/components/Settings/SettingsLayout';
import ProfileSettings from '@/components/Settings/ProfileSettings';
import PartnerSettings from '@/components/Settings/PartnerSettings';
import PreferenceSettings from '@/components/Settings/PreferenceSettings';
import DataSettings from '@/components/Settings/DataSettings';

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsLayout>
        <ProfileSettings />
        <PartnerSettings />
        <PreferenceSettings />
        <DataSettings />
      </SettingsLayout>
    </ProtectedRoute>
  );
}
