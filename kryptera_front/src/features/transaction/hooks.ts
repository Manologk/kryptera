import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { appendLocalTransaction, getLocalTransactions } from '@/services/transactionsStorage';
import { createTransaction, getTransactions } from '@/services/api';
import type { ConversionBreakdown, ConversionMode, Transaction } from '@/types';

export function useTransactions() {
  const { accessToken } = useAuth();
  const [version, setVersion] = useState(0);
  const [remoteList, setRemoteList] = useState<Transaction[] | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);

  const isApi = Boolean(accessToken);

  useEffect(() => {
    if (!accessToken) {
      setRemoteList(null);
      setRemoteLoading(false);
      return;
    }
    let cancelled = false;
    setRemoteLoading(true);
    void (async () => {
      const res = await getTransactions(accessToken);
      if (!cancelled) {
        setRemoteList(res.data ?? []);
        setRemoteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, version]);

  const transactions = useMemo(() => {
    if (isApi) return remoteList ?? [];
    return getLocalTransactions();
  }, [isApi, remoteList, version]);

  const refresh = useCallback(() => {
    setVersion(v => v + 1);
  }, []);

  const recordFromQuote = useCallback(
    async (
      mode: ConversionMode,
      breakdown: ConversionBreakdown,
      purpose?: string,
      recipientId?: number | null,
    ): Promise<{ ok: true; transaction: Transaction } | { ok: false; error: string }> => {
      if (accessToken) {
        const res = await createTransaction(
          {
            mode,
            inputAmount: breakdown.input,
            purpose,
            recipientId: recipientId ?? undefined,
            commissionOnTop: breakdown.commissionOnTop,
          },
          accessToken,
        );
        if (res.error || !res.data) {
          return { ok: false, error: res.error?.message ?? 'Could not create transfer.' };
        }
        refresh();
        return { ok: true, transaction: res.data };
      }

      const res = appendLocalTransaction({
        mode,
        inputAmount: breakdown.input,
        inputCurrency: breakdown.inputCurrency,
        resultAmount: breakdown.final,
        resultCurrency: breakdown.outputCurrency,
        purpose,
      });
      if (res.ok) refresh();
      return res;
    },
    [accessToken, refresh],
  );

  return { transactions, recordFromQuote, refresh, isApi, remoteLoading };
}
