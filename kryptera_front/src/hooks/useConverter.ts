import { useCallback, useState } from 'react';
import { COMMISSION_RATE } from '@/constants';
import type { ConversionBreakdown, ConversionMode, ExchangeRates } from '@/types';

function calcRussiaToZambia(
  amount: number,
  rates: ExchangeRates,
  commissionOnTop: boolean,
): ConversionBreakdown {
  const principal = amount;
  const commission = principal * COMMISSION_RATE;
  const afterCommission = commissionOnTop ? principal : principal - commission;
  const usd = afterCommission / rates.rubleToUsdBuying;
  const final = usd * rates.usdToKwachaSelling;
  const totalDebited = commissionOnTop ? principal + commission : principal;
  return {
    input: principal,
    inputCurrency: 'RUB',
    commission,
    afterCommission,
    usd,
    final,
    outputCurrency: 'ZMW',
    commissionOnTop,
    totalDebited,
  };
}

function calcZambiaToRussia(
  amount: number,
  rates: ExchangeRates,
  commissionOnTop: boolean,
): ConversionBreakdown {
  const principal = amount;
  const commission = principal * COMMISSION_RATE;
  const afterCommission = commissionOnTop ? principal : principal - commission;
  const usd = afterCommission / rates.kwachaToUsdBuying;
  const final = usd * rates.usdToRubleSelling;
  const totalDebited = commissionOnTop ? principal + commission : principal;
  return {
    input: principal,
    inputCurrency: 'ZMW',
    commission,
    afterCommission,
    usd,
    final,
    outputCurrency: 'RUB',
    commissionOnTop,
    totalDebited,
  };
}

interface UseConverterReturn {
  mode: ConversionMode;
  setMode: (mode: ConversionMode) => void;
  amount: string;
  setAmount: (v: string) => void;
  commissionOnTop: boolean;
  setCommissionOnTop: (v: boolean) => void;
  result: ConversionBreakdown | null;
  calculate: (rates: ExchangeRates) => void;
  reset: () => void;
}

export function useConverter(): UseConverterReturn {
  const [mode, setModeState] = useState<ConversionMode>('russia-zambia');
  const [amount, setAmount] = useState('');
  const [commissionOnTop, setCommissionOnTopState] = useState(false);
  const [result, setResult] = useState<ConversionBreakdown | null>(null);

  const setCommissionOnTop = useCallback((v: boolean) => {
    setCommissionOnTopState(v);
    setResult(null);
  }, []);

  const setMode = useCallback((m: ConversionMode) => {
    setModeState(m);
    setResult(null);
    setAmount('');
    setCommissionOnTopState(false);
  }, []);

  const calculate = useCallback(
    (rates: ExchangeRates) => {
      const n = parseFloat(amount);
      if (!n || n <= 0) return;
      const breakdown =
        mode === 'russia-zambia'
          ? calcRussiaToZambia(n, rates, commissionOnTop)
          : calcZambiaToRussia(n, rates, commissionOnTop);
      setResult(breakdown);
    },
    [amount, mode, commissionOnTop],
  );

  const reset = useCallback(() => {
    setAmount('');
    setResult(null);
  }, []);

  return {
    mode,
    setMode,
    amount,
    setAmount,
    commissionOnTop,
    setCommissionOnTop,
    result,
    calculate,
    reset,
  };
}
