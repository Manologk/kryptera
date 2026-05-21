import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { saveTransferQuote } from '@/services/transferQuoteStorage'
import { useAuth } from '@/context/AuthContext'
import { isKycVerified } from '@/lib/kyc'
import { useRates } from '@/context/RatesContext'
import { useConverter } from '@/hooks/useConverter'
import { roundMoney } from '@/lib/money'
import TransferForm from '@/features/transaction/components/TransferForm'
import SummaryCard from '@/features/transaction/components/SummaryCard'
import Layout, { PageHeader } from '@/components/layout/Layout'

export default function ConverterPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const needsKyc = isAuthenticated && user && !isKycVerified(user)
  const { rates } = useRates()
  const {
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
  } = useConverter()

  const isRZ = mode === 'russia-zambia'
  const hasRates = rates.rubleToUsdBuying > 0
  const hasAmountInput = sendAmount.trim() !== '' || receiveAmount.trim() !== ''

  useEffect(() => {
    if (!hasRates || !hasAmountInput) return
    recalculate(rates)
  }, [sendAmount, receiveAmount, commissionOnTop, mode, rates, hasRates, hasAmountInput, recalculate])

  function handleSend() {
    if (authLoading) return
    if (result) {
      saveTransferQuote({
        mode,
        inputAmount: roundMoney(result.input),
        commissionOnTop,
      })
    }
    if (isAuthenticated) {
      navigate(needsKyc ? ROUTES.kyc : ROUTES.transfer)
      return
    }
    navigate(ROUTES.login, { state: { from: ROUTES.transfer } })
  }

  return (
    <Layout maxWidth={480}>
      <PageHeader
        title="Send money"
        subtitle={isRZ ? 'Russia → Zambia · ₽ to ZMW' : 'Zambia → Russia · ZMW to ₽'}
      />

      {needsKyc ? (
        <div
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          Verify your identity before sending money.{' '}
          <Link to={ROUTES.kyc} className="font-medium underline underline-offset-2">
            Complete verification
          </Link>
        </div>
      ) : null}

      <TransferForm
        mode={mode}
        sendAmount={sendAmount}
        receiveAmount={receiveAmount}
        commissionOnTop={commissionOnTop}
        commissionOnTopDisabled={editSource === 'receive'}
        onCommissionOnTopChange={setCommissionOnTop}
        onModeChange={m => {
          setMode(m)
          reset()
        }}
        onSendAmountChange={setSendAmount}
        onReceiveAmountChange={setReceiveAmount}
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
  )
}
