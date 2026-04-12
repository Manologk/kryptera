import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRates } from '@/context/RatesContext';
import { useConverter } from '@/hooks/useConverter';
import { useTransactions } from '@/features/transaction/hooks';
import TransferForm from '@/features/transaction/components/TransferForm';
import SummaryCard from '@/features/transaction/components/SummaryCard';
import Layout, { PageHeader } from '@/components/layout/Layout';
import { getRecipients } from '@/services/api';
import type { Recipient } from '@/types';

export default function ConverterPage() {
  const { rates } = useRates();
  const { accessToken } = useAuth();
  const {
    mode,
    setMode,
    amount,
    setAmount,
    commissionOnTop,
    setCommissionOnTop,
    result,
    calculate,
    reset,
  } = useConverter();
  const { recordFromQuote } = useTransactions();

  const [recordMsg, setRecordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [recipientId, setRecipientId] = useState<number | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  useEffect(() => {
    if (!accessToken) {
      setRecipients([]);
      setRecipientId(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await getRecipients(accessToken);
      if (!cancelled && res.data) setRecipients(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const isRZ = mode === 'russia-zambia';
  const inputLabel = isRZ ? 'Amount in Rubles (₽)' : 'Amount in Kwacha (ZMW)';
  const inputPrefix = isRZ ? '₽' : 'K';

  function handleCalculate() {
    if (!rates.rubleToUsdBuying) {
      alert('Exchange rates not configured. Please visit the Admin page.');
      return;
    }
    setRecordMsg(null);
    calculate(rates);
  }

  async function handleRecordTransfer() {
    if (!result) return;
    const res = await recordFromQuote(mode, result, undefined, recipientId);
    if (res.ok) {
      setRecordMsg({
        type: 'success',
        text: 'Saved to your activity.',
      });
    } else {
      setRecordMsg({ type: 'error', text: res.error });
    }
  }

  return (
    <Layout maxWidth={480}>
      <PageHeader
        title="Send money"
        subtitle={isRZ ? 'Russia → Zambia · ₽ to ZMW' : 'Zambia → Russia · ZMW to ₽'}
      />

      <TransferForm
        mode={mode}
        amount={amount}
        inputLabel={inputLabel}
        inputPrefix={inputPrefix}
        commissionOnTop={commissionOnTop}
        onCommissionOnTopChange={setCommissionOnTop}
        onModeChange={m => {
          setMode(m);
          reset();
          setRecordMsg(null);
          setRecipientId(null);
        }}
        onAmountChange={setAmount}
        onCalculate={handleCalculate}
      />

      {result && (
        <SummaryCard
          mode={mode}
          result={result}
          recordMsg={recordMsg}
          onDismissRecordMsg={() => setRecordMsg(null)}
          onRecord={handleRecordTransfer}
          recipients={recipients}
          recipientId={recipientId}
          onRecipientIdChange={setRecipientId}
        />
      )}
    </Layout>
  );
}
