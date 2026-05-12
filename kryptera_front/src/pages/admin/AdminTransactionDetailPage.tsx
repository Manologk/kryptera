import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/context/AuthContext'
import TransactionSummaryCard from '@/features/transaction/TransactionSummaryCard'
import { adminKeys } from '@/features/admin/queryKeys'
import { getAdminTransaction, patchAdminTransaction, downloadTransactionPop } from '@/services/api'
import { filenameFromPath, isImagePath, mediaHref } from '@/lib/media'
import type { Transaction } from '@/types'
import Button from '@/components/ui/button'
import Card, { CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

const transactionsListPath = ROUTES.adminTransactions

export default function AdminTransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()
  const [deliveryFile, setDeliveryFile] = useState<File | null>(null)
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [completedSuccess, setCompletedSuccess] = useState(false)
  const [popDownloading, setPopDownloading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const txQuery = useQuery({
    queryKey: id ? adminKeys.transaction(id) : ['admin', 'tx', 'unknown'],
    enabled: !!accessToken && !!id,
    queryFn: async () => {
      const res = await getAdminTransaction(accessToken!, id!)
      if (res.error) throw new Error(res.error.message)
      if (!res.data) throw new Error('No data')
      return res.data
    },
  })

  const tx = txQuery.data

  useEffect(() => {
    if (tx?.adminNotes != null) setDeliveryNotes(tx.adminNotes)
  }, [tx?.adminNotes])

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing id')
      const res = await patchAdminTransaction(accessToken!, id, { confirmReceipt: true })
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => {
      toast.success('Receipt confirmed. Upload delivery proof when the payout is done.')
      setCompletedSuccess(false)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tx'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      void txQuery.refetch()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing id')
      if (!deliveryFile) throw new Error('Choose a delivery proof file.')
      const res = await patchAdminTransaction(accessToken!, id, {
        status: 'completed',
        admin_notes: deliveryNotes.trim() || undefined,
        delivery_proof: deliveryFile,
      })
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => {
      toast.success('Transaction marked as completed.')
      setCompletedSuccess(true)
      setDeliveryFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tx'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      void txQuery.refetch()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!accessToken) {
    return <p className="text-sm text-muted-foreground">Sign in as admin.</p>
  }

  if (!id) {
    return <p className="text-sm text-destructive">Missing transaction id.</p>
  }

  if (txQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (txQuery.isError || !tx) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{(txQuery.error as Error)?.message ?? 'Not found.'}</p>
        <Button asChild variant="secondary" fullWidth={false} className="w-auto">
          <Link to={transactionsListPath}>← Back to transactions</Link>
        </Button>
      </div>
    )
  }

  const showPopSection =
    tx.status === 'pending' ||
    tx.status === 'pop_not_uploaded' ||
    tx.status === 'awaiting_confirmation' ||
    tx.status === 'pending_verification' ||
    tx.status === 'completed'
  const popPath = tx.popPath
  const popUrl = popPath ? mediaHref(popPath) : null
  const popIsImage = isImagePath(popPath)
  const popName = filenameFromPath(popPath)

  const handleDownloadPop = async () => {
    if (!accessToken || !id) return
    setPopDownloading(true)
    const res = await downloadTransactionPop(id, accessToken, popName || 'proof-of-payment')
    setPopDownloading(false)
    if (res.error) toast.error(res.error.message)
  }

  const showConfirmBox =
    (tx.status === 'awaiting_confirmation' || tx.status === 'pending_verification') &&
    !tx.receiptConfirmed &&
    !completedSuccess

  const showDeliverySection =
    tx.receiptConfirmed &&
    tx.status !== 'completed' &&
    tx.status !== 'rejected' &&
    !completedSuccess

  const showCompletedBanner = completedSuccess && tx.status === 'completed'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight">Transaction detail</h2>
        <Button asChild variant="secondary" fullWidth={false} className="w-auto shrink-0">
          <Link to={transactionsListPath}>← Back</Link>
        </Button>
      </div>

      <TransactionSummaryCard tx={tx} />

      {showPopSection ? (
        <Card>
          <CardHeader title="Proof of payment (client)" />
          <CardContent className="space-y-4">
            {popUrl ? (
              <>
                {popIsImage ? (
                  <img
                    src={popUrl}
                    alt="Proof of payment"
                    className="max-h-[400px] w-full rounded-md border border-border bg-muted object-contain"
                  />
                ) : (
                  <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm">
                    <p className="font-medium">{popName || 'Uploaded file'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Preview not available for this file type.</p>
                  </div>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={popDownloading}
                  aria-busy={popDownloading}
                  onClick={() => void handleDownloadPop()}
                >
                  {popDownloading ? 'Downloading…' : 'Download POP'}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No proof of payment file on record.</p>
            )}

            {showConfirmBox ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-3 font-medium text-foreground">Have you received this payment?</p>
                <Button
                  type="button"
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending}
                >
                  Confirm receipt and proceed
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {showDeliverySection ? (
        <Card>
          <CardHeader
            title="Upload delivery proof"
            subtitle="Make the transfer to the recipient outside the system, then upload your proof below."
          />
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="delivery-proof">File (image or PDF)</Label>
              <input
                id="delivery-proof"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="mt-2 block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                onChange={e => setDeliveryFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label htmlFor="delivery-notes">Notes (optional)</Label>
              <Textarea
                id="delivery-notes"
                value={deliveryNotes}
                onChange={e => setDeliveryNotes(e.target.value)}
                rows={3}
                className="mt-2"
                placeholder="Visible to the client with the delivery proof."
              />
            </div>
            <Button
              type="button"
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending || !deliveryFile}
            >
              Save and mark as completed
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {showCompletedBanner ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Transaction marked as completed. The client can now view the proof.
        </div>
      ) : null}

      {tx.status === 'completed' && !completedSuccess ? (
        <p className="text-sm text-muted-foreground">
          This transaction is completed
          {tx.completedAt ? ` (${new Date(tx.completedAt).toLocaleString()})` : ''}.
        </p>
      ) : null}
    </div>
  )
}
