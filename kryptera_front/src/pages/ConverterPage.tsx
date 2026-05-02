import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { saveTransferQuote } from '@/services/transferQuoteStorage';
import { useAuth } from '@/context/AuthContext';
import { useRates } from '@/context/RatesContext';
import { useConverter } from '@/hooks/useConverter';
import TransferForm from '@/features/transaction/components/TransferForm';
import SummaryCard from '@/features/transaction/components/SummaryCard';
import Layout, { PageHeader } from '@/components/layout/Layout';

export default function ConverterPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { rates } = useRates();
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

  const isRZ = mode === 'russia-zambia';
  const inputLabel = isRZ ? 'Amount in Rubles (₽)' : 'Amount in Kwacha (ZMW)';
  const inputPrefix = isRZ ? '₽' : 'K';

  function handleCalculate() {
    if (!rates.rubleToUsdBuying) {
      alert('Exchange rates not configured. Please visit the Admin page.');
      return;
    }
    calculate(rates);
  }

  function handleSend() {
    if (authLoading) return;
    if (result) {
      const raw = parseFloat(String(amount).replace(/,/g, ''));
      if (Number.isFinite(raw) && raw > 0) {
        saveTransferQuote({
          mode,
          inputAmount: raw,
          commissionOnTop,
        });
      }
    }
    if (isAuthenticated) {
      navigate(ROUTES.transfer);
      return;
    }
    navigate(ROUTES.login, { state: { from: ROUTES.transfer } });
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
        }}
        onAmountChange={setAmount}
        onCalculate={handleCalculate}
      />

      {result && (
        <SummaryCard
          mode={mode}
          result={result}
          onSend={handleSend}
          sendDisabled={authLoading}
        />
      )}
    </Layout>
  );
}
