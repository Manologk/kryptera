import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Banknote, Bitcoin, Building2, Smartphone } from 'lucide-react'
import { clearTransferQuote, readTransferQuote } from '@/services/transferQuoteStorage'
import { createRecipient, createTransaction, getRecipients, uploadPop } from '@/services/api'
import { useTransactions } from '@/features/transaction/hooks'
import { useAuth } from '@/context/AuthContext'
import { useTransactionCountdown } from '@/hooks/useTransactionCountdown'
import { transferConfirmation } from '@/constants/routes'
import Layout, { PageHeader } from '@/components/layout/Layout'
import Button from '@/components/ui/button'
import Card from '@/components/ui/card'
import { Alert } from '@/components/ui/badge'
import {
  DELIVERY_OPTIONS,
  KRYPTERA_PAY_MOBILE_MONEY,
  KRYPTERA_PAY_USDT,
  PAYMENT_OPTIONS,
  type DeliveryOptionId,
  type PaymentOptionId,
} from '@/constants/transferPlaceholders'
import {
  buildDeliveryDetailsPayload,
  emptyDeliveryDetailFields,
  validateDeliveryDetails,
  type DeliveryDetailFields,
} from '@/features/recipient/deliveryDetails'
import type { Recipient } from '@/types'
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
}

export default function TransferWizard() {
  const navigate = useNavigate()
  const { accessToken } = useAuth()
  const { refresh: refreshTransactions } = useTransactions()

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

  const [createdTransactionId, setCreatedTransactionId] = useState<string | null>(null)
  const [popFile, setPopFile] = useState<File | null>(null)
  const [popUploadError, setPopUploadError] = useState<string | null>(null)
  const [popUploadBusy, setPopUploadBusy] = useState(false)

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
        phone_number: newPhone.trim() || undefined,
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
            recipientPhone: newPhone.trim() || undefined,
            recipientDeliveryMethod: newDeliveryMethod ?? undefined,
            recipientDeliveryDetails: inlineDelivery,
            deliveryMethod: deliveryMethod ?? undefined,
            paymentMethod: paymentMethod ?? undefined,
          },
      accessToken,
    )
    setProceedBusy(false)

    if (res.error || !res.data) {
      setStep3Error(res.error?.message ?? 'Could not create transfer.')
      return
    }
    clearTransferQuote()
    refreshTransactions()
    setCreatedTransactionId(res.data.id)
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

  return (
    <Layout maxWidth={560}>
      <PageHeader title="Send money" subtitle={STEP_SUBTITLES[step]} />

      <TransferStepIndicator currentStep={step} />

      <Card className="overflow-hidden border-border shadow-md">
        <div className="p-6 sm:p-7">
          {step === 1 ? (
            <RecipientStepPanel
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
                {DELIVERY_OPTIONS.map(opt => (
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
                {PAYMENT_OPTIONS.map(opt => (
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

              {paymentMethod === 'pay_mobile_money' ? (
                <div
                  className="rounded-lg border border-border bg-muted/30 p-4 text-sm"
                  style={{ animation: 'fadeUp 0.25s ease' }}
                >
                  <p className="font-semibold text-foreground">Pay with mobile money</p>
                  <p className="mt-2 font-mono text-base font-semibold text-foreground">{KRYPTERA_PAY_MOBILE_MONEY.displayNumber}</p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                    {KRYPTERA_PAY_MOBILE_MONEY.instructions.map(line => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {paymentMethod === 'pay_crypto_usdt' ? (
                <div
                  className="rounded-lg border border-border bg-muted/30 p-4 text-sm"
                  style={{ animation: 'fadeUp 0.25s ease' }}
                >
                  <p className="font-semibold text-foreground">Pay with USDT</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Network</p>
                  <p className="font-medium text-foreground">{KRYPTERA_PAY_USDT.network}</p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Wallet address</p>
                  <p className="break-all font-mono text-sm text-foreground">{KRYPTERA_PAY_USDT.address}</p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                    {KRYPTERA_PAY_USDT.instructions.map(line => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <form
              id={POP_FORM_ID}
              className="space-y-6 animate-fade-up"
              onSubmit={e => void handleSubmitPopProof(e)}
            >
              <p className="text-sm text-muted-foreground">
                Your transfer is created. Upload a screenshot or PDF of your payment so we can verify it.
              </p>
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
              Submit proof
            </Button>
          ) : null}
        </div>
      </Card>
    </Layout>
  )
}
