import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTransactionCountdown } from '@/hooks/useTransactionCountdown'
import { uploadPop } from '@/services/api'
import type { Transaction } from '@/types'
import Button from '@/components/ui/button'
import Card, { CardContent, CardHeader } from '@/components/ui/card'
import { Alert } from '@/components/ui/badge'
import { ProofOfPaymentCard } from '@/features/transfer/ProofOfPaymentCard'

export type PendingTransactionProps = {
  transaction: Transaction
  accessToken: string
  onTransactionUpdated: (tx: Transaction) => void
  /** Called when the client countdown reaches zero or the server already returned canceled — refresh parent tx. */
  onTimerExpired?: () => void
}

export const PendingTransaction = ({
  transaction,
  accessToken,
  onTransactionUpdated,
  onTimerExpired,
}: PendingTransactionProps) => {
  const { isExpired, isLoading, loadError, formattedRemaining } = useTransactionCountdown(transaction.id, {
    status: transaction.status,
    popPath: transaction.popPath,
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const expiredSyncRef = useRef(false)

  useEffect(() => {
    expiredSyncRef.current = false
  }, [transaction.id])

  useEffect(() => {
    if (!isExpired || expiredSyncRef.current) return
    expiredSyncRef.current = true
    onTimerExpired?.()
  }, [isExpired, onTimerExpired])

  const handleSubmitProof = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || isExpired) return
    setUploadError(null)
    setUploading(true)
    const res = await uploadPop(transaction.id, file, accessToken)
    setUploading(false)
    if (res.error) {
      setUploadError(res.error.message)
      return
    }
    if (res.data) {
      onTransactionUpdated(res.data)
      setFile(null)
    }
  }

  if (isLoading && !transaction.popPath) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading payment timer…
      </p>
    )
  }

  const proofPreviewCard = transaction.popPath ? (
    <ProofOfPaymentCard
      transaction={transaction}
      accessToken={accessToken}
      subtitle={
        transaction.status === 'pending' && !isExpired
          ? 'You can open or download your file. Replace it below if needed.'
          : undefined
      }
    />
  ) : null

  if (isExpired) {
    return (
      <div className="space-y-4">
        {proofPreviewCard}
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          Transaction expired — proof of payment was not uploaded before the deadline. Start a new transfer if you
          still need to send money.
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <Alert type="error" message={loadError} />
    )
  }

  return (
    <div className="space-y-5">
      {proofPreviewCard}

      {isLoading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Updating payment timer…
        </p>
      ) : null}

      {formattedRemaining ? (
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

      <Card>
        <CardHeader
          title={transaction.popPath ? 'Replace proof of payment' : 'Waiting for your proof of payment'}
          subtitle={
            transaction.popPath
              ? 'Your previous upload is on file. You can attach a new file if the transfer was interrupted or the file was wrong.'
              : 'Upload a screenshot or PDF of your payment to continue.'
          }
        />
        <CardContent className="pt-0">
          {uploadError ? (
            <div className="mb-4">
              <Alert type="error" message={uploadError} onClose={() => setUploadError(null)} />
            </div>
          ) : null}
          <form onSubmit={e => void handleSubmitProof(e)} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="pending-tx-pop-file"
                className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground"
              >
                File
              </label>
              <input
                id="pending-tx-pop-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                aria-label="Proof of payment file"
                className="w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
                onChange={e => {
                  setFile(e.target.files?.[0] ?? null)
                  setUploadError(null)
                }}
              />
            </div>
            <Button type="submit" size="lg" loading={uploading} disabled={!file || uploading}>
              {transaction.popPath ? 'Submit new proof' : 'Submit proof'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
