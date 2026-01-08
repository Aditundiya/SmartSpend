'use client';

import { useProfile } from '@/contexts/ProfileContext';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils';
import { useCallback } from 'react';

export function useCurrency() {
    const { currentProfile } = useProfile();
    const currency = currentProfile?.preferences?.currency || 'USD';

    const format = useCallback((amount: number) => {
        return formatCurrencyUtil(amount, currency);
    }, [currency]);

    return { format, currency };
}
