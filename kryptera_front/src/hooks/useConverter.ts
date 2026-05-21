import { useCallback, useState } from 'react'
import type { ConversionBreakdown, ConversionMode, ExchangeRates } from '@/types'
import {
  breakdownForMode,
  commissionFraction,
  formatConverterAmount,
  principalFromFinal,
  principalFromSendAmount,
  sendAmountFromBreakdown,
} from '@/lib/conversionMath'
import { roundMoney } from '@/lib/money'

export type AmountEditSource = 'send' | 'receive'

interface UseConverterReturn {
  mode: ConversionMode
  setMode: (mode: ConversionMode) => void
  sendAmount: string
  receiveAmount: string
  editSource: AmountEditSource
  setSendAmount: (v: string) => void
  setReceiveAmount: (v: string) => void
  commissionOnTop: boolean
  setCommissionOnTop: (v: boolean) => void
  result: ConversionBreakdown | null
  recalculate: (rates: ExchangeRates) => void
  reset: () => void
}

export function useConverter(): UseConverterReturn {
  const [mode, setModeState] = useState<ConversionMode>('russia-zambia')
  const [sendAmount, setSendAmountState] = useState('')
  const [receiveAmount, setReceiveAmountState] = useState('')
  const [editSource, setEditSource] = useState<AmountEditSource>('send')
  const [commissionOnTop, setCommissionOnTopState] = useState(false)
  const [result, setResult] = useState<ConversionBreakdown | null>(null)

  const setCommissionOnTop = useCallback((v: boolean) => {
    setCommissionOnTopState(v)
  }, [])

  const setMode = useCallback((m: ConversionMode) => {
    setModeState(m)
    setResult(null)
    setSendAmountState('')
    setReceiveAmountState('')
    setEditSource('send')
    setCommissionOnTopState(false)
  }, [])

  const setSendAmount = useCallback((v: string) => {
    setEditSource('send')
    setSendAmountState(v)
  }, [])

  const setReceiveAmount = useCallback((v: string) => {
    setEditSource('receive')
    setReceiveAmountState(v)
    setCommissionOnTopState(false)
  }, [])

  const recalculate = useCallback(
    (rates: ExchangeRates) => {
      const cr = commissionFraction(rates)

      if (editSource === 'receive') {
        const final = roundMoney(parseFloat(receiveAmount))
        if (!final || final <= 0) {
          setSendAmountState('')
          setResult(null)
          return
        }
        const principal = principalFromFinal(mode, final, rates, false, cr)
        const breakdown = breakdownForMode(mode, principal, rates, false, cr)
        setResult(breakdown)
        setSendAmountState(formatConverterAmount(sendAmountFromBreakdown(breakdown)))
        return
      }

      const send = roundMoney(parseFloat(sendAmount))
      if (!send || send <= 0) {
        setReceiveAmountState('')
        setResult(null)
        return
      }
      const principal = principalFromSendAmount(send)
      const breakdown = breakdownForMode(mode, principal, rates, commissionOnTop, cr)
      setResult(breakdown)
      setReceiveAmountState(formatConverterAmount(breakdown.final))
    },
    [sendAmount, receiveAmount, editSource, mode, commissionOnTop],
  )

  const reset = useCallback(() => {
    setSendAmountState('')
    setReceiveAmountState('')
    setResult(null)
    setEditSource('send')
  }, [])

  return {
    mode,
    setMode,
    sendAmount,
    receiveAmount,
    editSource,
    setSendAmount,
    setReceiveAmount,
    commissionOnTop,
    setCommissionOnTop,
    result,
    recalculate,
    reset,
  }
}
