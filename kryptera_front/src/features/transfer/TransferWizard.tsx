import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Banknote, Bitcoin, Building2, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { clearTransferQuote, readTransferQuote } from '@/services/transferQuoteStorage'
import { createRecipient, createTransaction, getPaymentReceiving, getRecipients, uploadPop } from '@/services/api'
import { useTransactions } from '@/features/transaction/hooks'
import { useAuth } from '@/context/AuthContext'
import { useTransactionCountdown } from '@/hooks/useTransactionCountdown'
import { ROUTES, transferConfirmation } from '@/constants/routes'
import Layout, { PageHeader } from '@/components/layout/Layout'
import Button from '@/components/ui/button'
import { Alert, StatusBadge } from '@/components/ui/badge'
import { UploadBusyOverlay } from '@/components/ui/upload-busy-overlay'
import {
  getDeliveryMethodTitle,
  getDeliveryOptionsForCorridor,
  getPaymentMethodTitle,
  getPaymentOptionsForCorridor,
  type DeliveryOptionId,
  type PaymentOptionId,
} from '@/constants/transferPlaceholders'
import { PaymentReceivingPanel } from '@/features/transfer/PaymentReceivingPanel'
import { resolvePaymentReceivingConfig } from '@/features/transfer/paymentReceivingFallback'
import {
  buildDeliveryDetailsPayload,
  emptyDeliveryDetailFields,
  resolveRecipientPhoneNumber,
  validateDeliveryDetails,
  type DeliveryDetailFields,
} from '@/features/recipient/deliveryDetails'
import { formatMoneyAmount } from '@/features/transaction/utils'
import type { Recipient, Transaction } from '@/types'
import Card, { CardContent, CardHeader } from '@/components/ui/card'
import ChoiceTile from './ChoiceTile'
import RecipientStepPanel from './RecipientStepPanel'
import TransferStepIndicator, { type TransferWizardStep } from './TransferStepIndicator'

const POP_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'
const POP_FORM_ID = 'transfer-wizard-pop-form'

const STEP_SUBTITLES: Record<TransferWizardStep, string> = {
  1: 'Who should receive this transfer?',
  2: 'How should they receive the money?',
  3: 'How would you like to pay?',
  4: 'Upload proof of payment',
}

const DELIVERY_ICONS: Record<DeliveryOptionId, ReactNode> = {
  bank_deposit: <Building2 className="h-5 w-5" aria-hidden />,
  mobile_money: <Smartphone className="h-5 w-5" aria-hidden />,
  cash_pickup: <Banknote className="h-5 w-5" aria-hidden />,
}

const PAYMENT_ICONS: Record<PaymentOptionId, ReactNode> = {
  pay_mobile_money: <Smartphone className="h-5 w-5" aria-hidden />,
  pay_crypto_usdt: <Bitcoin className="h-5 w-5" aria-hidden />,
  pay_bank_ru: <Building2 className="h-5 w-5" aria-hidden />,
}

const corridorSummaryLabel = (mode: Transaction['mode']): string =>
  mode === 'russia-zambia' ? 'Russia → Zambia' : 'Zambia → Russia'

const recipientSummaryLine = (tx: Transaction): string => {
  if (tx.recipient?.fullName) return tx.recipient.fullName
  const s = tx.recipientSnapshot
  if (!s) return '—'
  return s.full_name || s.email || s.phone_number || s.phone || '—'
}

const parseBreakdownUsd = (tx: Transaction): number | null => {
  const raw = tx.conversionBreakdown?.usd
  if (raw == null || String(raw).trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

type YouSendSummary = { primary: string; sub?: string }

const getYouSendSummary = (tx: Transaction): YouSendSummary => {
  const fiatLine = formatMoneyAmount(tx.inputAmount, tx.inputCurrency)
  if (tx.paymentMethod === 'pay_crypto_usdt') {
    const usd = parseBreakdownUsd(tx)
    if (usd != null) {
      return {
        primary: formatMoneyAmount(usd, 'USD'),
        sub: `Transfer amount: ${fiatLine}`,
      }
    }
    return { primary: fiatLine }
  }
  return { primary: fiatLine }
}

export default function TransferWizard() {
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const { refresh: refreshTransactions } = useTransactions()

  const quote = readTransferQuote()
  const corridorMode = quote?.mode ?? 'zambia-russia'
  const quoteInputAmount = quote?.inputAmount ?? 0
  const deliveryOptionsForCorridor = useMemo(() => getDeliveryOptionsForCorridor(corridorMode), [corridorMode])
  const paymentOptionsForCorridor = useMemo(() => getPaymentOptionsForCorridor(corridorMode), [corridorMode])

  const [step, setStep] = useState<TransferWizardStep>(1)

  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [recipientsLoading, setRecipientsLoading] = useState(true)

  const [sourceTab, setSourceTab] = useState<'saved' | 'new'>('saved')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecipientId, setSelectedRecipientId] = useState<number | null>(null)

  const [newFullName, setNewFullName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newDeliveryMethod, setNewDeliveryMethod] = useState<DeliveryOptionId | null>(null)
  const [deliveryDetailFields, setDeliveryDetailFields] = useState<DeliveryDetailFields>(emptyDeliveryDetailFields)
  const [saveForLater, setSaveForLater] = useState(true)

  const [step1Error, setStep1Error] = useState<string | null>(null)
  const [step2Error, setStep2Error] = useState<string | null>(null)
  const [step3Error, setStep3Error] = useState<string | null>(null)

  const [continueBusy, setContinueBusy] = useState(false)
  const [proceedBusy, setProceedBusy] = useState(false)

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryOptionId | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentOptionId | null>(null)

  const paymentConfigsQuery = useQuery({
    queryKey: ['paymentReceiving', corridorMode],
    enabled: Boolean(accessToken) && step >= 3,
    queryFn: async () => {
      const res = await getPaymentReceiving(accessToken!, corridorMode)
      if (res.error) throw new Error(res.error.message)
      return res.data ?? []
    },
  })

  const activePaymentConfig = useMemo(() => {
    if (!paymentMethod) return null
    return resolvePaymentReceivingConfig(paymentConfigsQuery.data, corridorMode, paymentMethod)
  }, [paymentConfigsQuery.data, corridorMode, paymentMethod])

  const [createdTransactionId, setCreatedTransactionId] = useState<string | null>(null)
  const [proofStepTransaction, setProofStepTransaction] = useState<Transaction | null>(null)
  const [popFile, setPopFile] = useState<File | null>(null)
  const [popUploadError, setPopUploadError] = useState<string | null>(null)
  const [popUploadBusy, setPopUploadBusy] = useState(false)

  const proofStepPaymentConfig = useMemo(() => {
    const method = proofStepTransaction?.paymentMethod as PaymentOptionId | undefined
    const mode = proofStepTransaction?.mode ?? corridorMode
    if (!method) return null
    return resolvePaymentReceivingConfig(paymentConfigsQuery.data, mode, method)
  }, [paymentConfigsQuery.data, proofStepTransaction, corridorMode])

  const { isExpired, isLoading: countdownLoading, loadError: countdownError, formattedRemaining } =
    useTransactionCountdown(createdTransactionId ?? undefined, {
      status: 'pending',
    })

  const loadRecipients = useCallback(async () => {
    if (!accessToken) {
      setRecipients([])
      setRecipientsLoading(false)
      return
    }
    setRecipientsLoading(true)
    const res = await getRecipients(accessToken)
    if (res.data) setRecipients(res.data)
    setRecipientsLoading(false)
  }, [accessToken])

  useEffect(() => {
    void loadRecipients()
  }, [loadRecipients])

  useEffect(() => {
    const options = getDeliveryOptionsForCorridor(corridorMode)
    const defaultDelivery: DeliveryOptionId =
      corridorMode === 'russia-zambia' ? 'mobile_money' : 'bank_deposit'
    const keepOrDefault = (prev: DeliveryOptionId | null) =>
      prev != null && options.some(o => o.id === prev) ? prev : defaultDelivery
    setDeliveryMethod(prev => keepOrDefault(prev))
    setNewDeliveryMethod(prev => keepOrDefault(prev))
  }, [corridorMode])

  useEffect(() => {
    const allowedIds = new Set(paymentOptionsForCorridor.map(o => o.id))
    setPaymentMethod(prev => (prev != null && allowedIds.has(prev) ? prev : null))
  }, [corridorMode, paymentOptionsForCorridor])

  const handleContinueStep1 = async () => {
    setStep1Error(null)

    if (sourceTab === 'saved') {
      if (selectedRecipientId == null) {
        setStep1Error('Select a recipient from the list, or switch to “Someone new”.')
        return
      }
      setStep(2)
      return
    }

    const name = newFullName.trim()
    if (!name) {
      setStep1Error('Enter the recipient’s full name.')
      return
    }

    const deliveryErr = validateDeliveryDetails(newDeliveryMethod, deliveryDetailFields)
    if (deliveryErr) {
      setStep1Error(deliveryErr)
      return
    }

    if (saveForLater) {
      if (!accessToken) {
        setStep1Error('You need to be signed in to save a recipient.')
        return
      }
      if (newDeliveryMethod == null) {
        setStep1Error('Choose how this contact receives funds.')
        return
      }
      setContinueBusy(true)
      const detailsPayload = buildDeliveryDetailsPayload(newDeliveryMethod, deliveryDetailFields)
      const res = await createRecipient(accessToken, {
        full_name: name,
        email: newEmail.trim() || undefined,
        phone_number: resolveRecipientPhoneNumber(newPhone, newDeliveryMethod, deliveryDetailFields),
        delivery_method: newDeliveryMethod,
        delivery_details: detailsPayload,
      })
      setContinueBusy(false)
      if (res.error) {
        setStep1Error(res.error.message)
        return
      }
      if (res.data) {
        setRecipients(prev => {
          const rest = prev.filter(r => r.id !== res.data!.id)
          return [res.data!, ...rest]
        })
        setSelectedRecipientId(res.data.id)
        setSourceTab('saved')
        setStep(2)
        return
      }
    }

    setStep(2)
  }

  const handleCopyUsdtAddress = async (address: string) => {
    if (!address.trim()) return
    try {
      await navigator.clipboard.writeText(address)
      toast.success('Wallet address copied')
    } catch {
      toast.error('Could not copy. Select the address and copy manually.')
    }
  }

  const handleContinueStep2 = () => {
    setStep2Error(null)
    if (deliveryMethod == null) {
      setStep2Error('Choose how the recipient should receive the funds.')
      return
    }
    setStep(3)
  }

  const handleProceed = async () => {
    setStep3Error(null)
    if (paymentMethod == null) {
      setStep3Error('Choose how you’d like to pay Kryptera.')
      return
    }
    if (!accessToken) {
      setStep3Error('You must be signed in to submit this transfer.')
      return
    }
    if (createdTransactionId && proofStepTransaction) {
      setStep(4)
      return
    }
    const quote = readTransferQuote()
    if (!quote) {
      setStep3Error('Calculate an amount on the home page first, then tap Send to continue.')
      return
    }

    setProceedBusy(true)
    const inlineDelivery =
      newDeliveryMethod != null ? buildDeliveryDetailsPayload(newDeliveryMethod, deliveryDetailFields) : {}
    const res = await createTransaction(
      selectedRecipientId != null
        ? {
            mode: quote.mode,
            inputAmount: quote.inputAmount,
            commissionOnTop: quote.commissionOnTop,
            recipientId: selectedRecipientId,
            deliveryMethod: deliveryMethod ?? undefined,
            paymentMethod: paymentMethod ?? undefined,
          }
        : {
            mode: quote.mode,
            inputAmount: quote.inputAmount,
            commissionOnTop: quote.commissionOnTop,
            recipientFullName: newFullName.trim(),
            recipientEmail: newEmail.trim() || undefined,
            recipientPhone: resolveRecipientPhoneNumber(newPhone, newDeliveryMethod, deliveryDetailFields),
            recipientDeliveryMethod: newDeliveryMethod ?? undefined,
            recipientDeliveryDetails: inlineDelivery,
            deliveryMethod: deliveryMethod ?? undefined,
            paymentMethod: paymentMethod ?? undefined,
          },
      accessToken,
    )
    setProceedBusy(false)

    if (res.error || !res.data) {
      const msg = res.error?.message ?? 'Could not create transfer.'
      setStep3Error(msg)
      if (msg.toLowerCase().includes('verification')) {
        toast.error('Complete identity verification before sending.')
        navigate(ROUTES.kyc)
      }
      return
    }
    clearTransferQuote()
    refreshTransactions()
    setCreatedTransactionId(res.data.id)
    setProofStepTransaction(res.data)
    setPopFile(null)
    setPopUploadError(null)
    setStep(4)
  }

  const handleSubmitPopProof = async (e: FormEvent) => {
    e.preventDefault()
    if (!popFile || !accessToken || !createdTransactionId || isExpired) return
    setPopUploadError(null)
    setPopUploadBusy(true)
    const res = await uploadPop(createdTransactionId, popFile, accessToken)
    setPopUploadBusy(false)
    if (res.error) {
      setPopUploadError(res.error.message)
      refreshTransactions()
      return
    }
    refreshTransactions()
    navigate(transferConfirmation(createdTransactionId))
  }

  const goBack = () => {
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
  }

  const footerIsSplit = step > 1 && step < 4

  const step4YouSendSummary = proofStepTransaction ? getYouSendSummary(proofStepTransaction) : null

  return (
    <Layout maxWidth={560}>
      <PageHeader title="Send money" subtitle={STEP_SUBTITLES[step]} />

      <TransferStepIndicator currentStep={step} />

      <Card className="overflow-hidden border-border shadow-md">
        <div className="p-6 sm:p-7">
          {step === 1 ? (
            <RecipientStepPanel
              corridorMode={corridorMode}
              sourceTab={sourceTab}
              onSourceTabChange={setSourceTab}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              recipients={recipients}
              recipientsLoading={recipientsLoading}
              selectedRecipientId={selectedRecipientId}
              onSelectRecipientId={setSelectedRecipientId}
              newFullName={newFullName}
              newEmail={newEmail}
              newPhone={newPhone}
              onNewFullNameChange={setNewFullName}
              onNewEmailChange={setNewEmail}
              onNewPhoneChange={setNewPhone}
              newDeliveryMethod={newDeliveryMethod}
              onNewDeliveryMethodChange={id => {
                setNewDeliveryMethod(id)
                setDeliveryDetailFields(emptyDeliveryDetailFields())
              }}
              deliveryDetailFields={deliveryDetailFields}
              onDeliveryDetailFieldsChange={patch =>
                setDeliveryDetailFields(prev => ({ ...prev, ...patch }))
              }
              saveForLater={saveForLater}
              onSaveForLaterChange={setSaveForLater}
              error={step1Error}
            />
          ) : null}

          {step === 2 ? (
            <div className="space-y-6 animate-fade-up">
              <p className="text-sm text-muted-foreground">
                Select one option. Your choice helps us route the payout correctly.
              </p>
              {step2Error ? (
                <p className="text-sm text-destructive" role="alert">
                  {step2Error}
                </p>
              ) : null}
              <div className="flex flex-col gap-3" role="radiogroup" aria-label="Delivery method">
                {deliveryOptionsForCorridor.map(opt => (
                  <ChoiceTile
                    key={opt.id}
                    name={`delivery-${opt.id}`}
                    title={opt.title}
                    description={opt.description}
                    selected={deliveryMethod === opt.id}
                    onSelect={() => setDeliveryMethod(opt.id)}
                    icon={DELIVERY_ICONS[opt.id]}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-6 animate-fade-up">
              <p className="text-sm text-muted-foreground">
                Choose how you’ll send funds to Kryptera. Details appear below each option.
              </p>
              {step3Error ? (
                <p className="text-sm text-destructive" role="alert">
                  {step3Error}
                </p>
              ) : null}

              <div className="flex flex-col gap-3" role="radiogroup" aria-label="Payment method">
                {paymentOptionsForCorridor.map(opt => (
                  <ChoiceTile
                    key={opt.id}
                    name={`payment-${opt.id}`}
                    title={opt.title}
                    description={opt.description}
                    selected={paymentMethod === opt.id}
                    onSelect={() => setPaymentMethod(opt.id)}
                    icon={PAYMENT_ICONS[opt.id]}
                  />
                ))}
              </div>

              {paymentMethod != null && activePaymentConfig ? (
                <PaymentReceivingPanel
                  corridor={corridorMode}
                  paymentMethod={paymentMethod}
                  config={activePaymentConfig}
                  amount={quoteInputAmount}
                  inputCurrency={corridorMode === 'russia-zambia' ? 'RUB' : 'ZMW'}
                  onCopyUsdtAddress={
                    paymentMethod === 'pay_crypto_usdt'
                      ? () =>
                          void handleCopyUsdtAddress(activePaymentConfig.details.address ?? '')
                      : undefined
                  }
                />
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <form
              id={POP_FORM_ID}
              className="relative space-y-6 animate-fade-up"
              onSubmit={e => void handleSubmitPopProof(e)}
            >
              <UploadBusyOverlay busy={popUploadBusy} label="Uploading proof of payment…" />
              <p className="text-sm text-muted-foreground">
                Your transfer is created. Upload a screenshot or PDF of your payment so we can verify it.
              </p>
              {proofStepTransaction ? (
                <div
                  className="rounded-lg border border-border bg-card shadow-sm"
                  role="region"
                  aria-label="Transfer summary"
                >
                  <CardHeader title="Transfer summary" className="p-5 pb-2" />
                  <CardContent className="space-y-0 p-5 pt-0">
                    {step4YouSendSummary ? (
                      <div className="mb-5 rounded-lg border border-primary/25 bg-primary/5 px-4 py-5 sm:px-5">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Amount to send</p>
                        <p
                          className="mt-2 break-words font-mono text-3xl font-bold leading-none tracking-tight text-foreground sm:text-4xl"
                          aria-label={`Amount to send: ${step4YouSendSummary.primary}`}
                        >
                          {step4YouSendSummary.primary}
                        </p>
                        {step4YouSendSummary.sub ? (
                          <p className="mt-3 text-sm leading-snug text-muted-foreground">{step4YouSendSummary.sub}</p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-2.5 text-sm">
                      <span className="text-muted-foreground">Corridor</span>
                      <span className="max-w-[min(100%,18rem)] text-right font-medium">
                        {corridorSummaryLabel(proofStepTransaction.mode)}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-2.5 text-sm">
                      <span className="text-muted-foreground">Recipient gets</span>
                      <span className="font-mono font-semibold">
                        {formatMoneyAmount(proofStepTransaction.resultAmount, proofStepTransaction.resultCurrency)}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-2.5 text-sm">
                      <span className="text-muted-foreground">Recipient</span>
                      <span className="max-w-[min(100%,18rem)] text-right font-medium">
                        {recipientSummaryLine(proofStepTransaction)}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-2.5 text-sm">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="max-w-[min(100%,18rem)] text-right font-medium">
                        {getDeliveryMethodTitle(proofStepTransaction.deliveryMethod)}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-2.5 text-sm">
                      <span className="text-muted-foreground">Your payment</span>
                      <span className="max-w-[min(100%,18rem)] text-right font-medium">
                        {getPaymentMethodTitle(proofStepTransaction.paymentMethod)}
                      </span>
                    </div>
                    {proofStepTransaction.paymentMethod && proofStepPaymentConfig ? (
                      <PaymentReceivingPanel
                        corridor={proofStepTransaction.mode}
                        paymentMethod={proofStepTransaction.paymentMethod as PaymentOptionId}
                        config={proofStepPaymentConfig}
                        amount={Number(proofStepTransaction.inputAmount)}
                        inputCurrency={proofStepTransaction.inputCurrency}
                        variant="summary"
                        onCopyUsdtAddress={
                          proofStepTransaction.paymentMethod === 'pay_crypto_usdt'
                            ? () =>
                                void handleCopyUsdtAddress(
                                  proofStepPaymentConfig.details.address ?? '',
                                )
                            : undefined
                        }
                      />
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <StatusBadge status={proofStepTransaction.status} />
                    </div>
                  </CardContent>
                </div>
              ) : null}
              {countdownLoading ? (
                <p className="text-sm text-muted-foreground" role="status">
                  Loading payment timer…
                </p>
              ) : null}
              {countdownError ? (
                <div>
                  <Alert type="error" message={countdownError} />
                </div>
              ) : null}
              {isExpired ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
                >
                  Transaction expired — proof of payment was not uploaded before the deadline. Start a new transfer if
                  you still need to send money.
                </div>
              ) : null}
              {!isExpired && formattedRemaining ? (
                <div
                  role="timer"
                  aria-live="polite"
                  aria-atomic="true"
                  aria-label={`Time remaining to upload proof of payment: ${formattedRemaining}`}
                  className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm font-medium text-foreground"
                >
                  <p className="m-0">
                    Upload proof of payment within{' '}
                    <span className="font-mono text-base font-bold tabular-nums">{formattedRemaining}</span>
                  </p>
                </div>
              ) : null}
              {popUploadError ? (
                <div>
                  <Alert type="error" message={popUploadError} onClose={() => setPopUploadError(null)} />
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="wizard-pop-file"
                  className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground"
                >
                  File
                </label>
                <input
                  id="wizard-pop-file"
                  type="file"
                  accept={POP_ACCEPT}
                  aria-label="Proof of payment file"
                  disabled={isExpired || countdownLoading}
                  className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  onChange={e => {
                    setPopFile(e.target.files?.[0] ?? null)
                    setPopUploadError(null)
                  }}
                />
              </div>
            </form>
          ) : null}
        </div>

        <div
          className={
            step === 1
              ? 'flex justify-end border-t border-border bg-muted/20 px-6 py-5 sm:px-7'
              : 'flex flex-col gap-3 border-t border-border bg-muted/20 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7'
          }
        >
          {footerIsSplit ? (
            <Button type="button" variant="secondary" fullWidth={false} className="w-auto px-6" onClick={goBack}>
              Back
            </Button>
          ) : null}
          {step < 3 ? (
            <Button
              type="button"
              size="lg"
              variant="primary"
              fullWidth={false}
              className={step === 1 ? 'min-w-[200px] sm:w-auto' : 'min-w-[200px] sm:ml-auto sm:w-auto'}
              loading={step === 1 && continueBusy}
              disabled={step === 1 && continueBusy}
              onClick={() => {
                if (step === 1) void handleContinueStep1()
                else handleContinueStep2()
              }}
            >
              Continue
            </Button>
          ) : null}
          {step === 3 ? (
            <Button
              type="button"
              size="lg"
              variant="primary"
              fullWidth={false}
              className="min-w-[200px] sm:ml-auto sm:w-auto"
              loading={proceedBusy}
              disabled={proceedBusy}
              onClick={() => void handleProceed()}
            >
              Proceed
            </Button>
          ) : null}
          {step === 4 ? (
            <Button
              type="submit"
              form={POP_FORM_ID}
              size="lg"
              variant="primary"
              fullWidth={false}
              className="min-w-[200px] w-full sm:ml-auto sm:w-auto"
              loading={popUploadBusy}
              disabled={!popFile || popUploadBusy || isExpired || countdownLoading}
            >
              {popUploadBusy ? 'Uploading…' : 'Submit proof'}
            </Button>
          ) : null}
        </div>
      </Card>
    </Layout>
  )
}
