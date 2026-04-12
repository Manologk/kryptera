import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_RATES } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { getRates, updateRates } from '@/services/api';
import type { ExchangeRates } from '@/types';

interface RatesContextValue {
  rates: ExchangeRates;
  loading: boolean;
  saveRates: (rates: ExchangeRates) => Promise<boolean>;
  refresh: () => Promise<void>;
}

const RatesContext = createContext<RatesContextValue | null>(null);

export function RatesProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_RATES);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await getRates();
    if (res.data) setRates(res.data);
    setLoading(false);
  }, []);

  const saveRates = useCallback(
    async (newRates: ExchangeRates): Promise<boolean> => {
      if (!accessToken) return false;
      const res = await updateRates(newRates, accessToken);
      if (res.data) {
        setRates(res.data);
        return true;
      }
      return false;
    },
    [accessToken],
  );

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <RatesContext.Provider value={{ rates, loading, saveRates, refresh }}>
      {children}
    </RatesContext.Provider>
  );
}

export function useRates(): RatesContextValue {
  const ctx = useContext(RatesContext);
  if (!ctx) throw new Error('useRates must be used within RatesProvider');
  return ctx;
}
