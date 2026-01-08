'use client';

import { useEffect } from 'react';
import { initOfflineStorage, onOnline, onOffline } from '@/lib/offline-storage';
import { useToast } from '@/hooks/use-toast';

export default function PWAInitializer() {
  const { toast } = useToast();

  useEffect(() => {
    // Initialize offline storage
    initOfflineStorage().catch(console.error);

    // Handle online/offline events
    const handleOnline = () => {
      toast({
        title: 'Back Online',
        description: 'Your data will now sync automatically.',
        className: 'bg-green-50 text-green-900 border-green-200',
      });
    };

    const handleOffline = () => {
      toast({
        title: 'You\'re Offline',
        description: 'Don\'t worry, you can still add expenses. They\'ll sync when you\'re back online.',
        className: 'bg-orange-50 text-orange-900 border-orange-200',
      });
    };

    onOnline(handleOnline);
    onOffline(handleOffline);

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_OFFLINE_EXPENSES') {
          // Handle offline expense sync
          console.log('Syncing offline expenses:', event.data.data);
        }
        
        if (event.data && event.data.type === 'SYNC_OFFLINE_INCOMES') {
          // Handle offline income sync
          console.log('Syncing offline incomes:', event.data.data);
        }
      });
    }

    return () => {
      // Cleanup if needed
    };
  }, [toast]);

  return null; // This component doesn't render anything
}