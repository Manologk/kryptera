import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { adminKeys } from '@/features/admin/queryKeys';
import { recipientDisplay, senderDisplay, senderSecondaryLine } from '@/features/admin/transactionLabels';
import { recipientPayoutDetailRows, recipientReceiveMethod } from '@/features/recipient/deliveryDetails';
import { formatMoneyAmount } from '@/features/transaction/utils';
import { DELIVERY_OPTIONS, getPaymentMethodTitle } from '@/constants/transferPlaceholders';
import { getAdminTransaction, patchAdminTransaction, downloadTransactionPop } from '@/services/api';
import { filenameFromPath, isImagePath, mediaHref } from '@/lib/media';
import { Button } from '@/components/ui/button';
import Card, { CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const adminPendingPath = ROUTES.adminPending;

const deliveryLabel = (id: string | undefined): string => {
  if (!id) return '—';
  return DELIVERY_OPTIONS.find(o => o.id === id)?.title ?? id;
};

const paymentLabel = (id: string | undefined): string => getPaymentMethodTitle(id);

function SummaryRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 py-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={`text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export default function AdminPendingTransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [popDownloading, setPopDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const txQuery = useQuery({
    queryKey: id ? adminKeys.pendingTransaction(id) : ['admin', 'pendingTx', 'unknown'],
    enabled: !!accessToken && !!id,
    refetchInterval: 15_000,
    queryFn: async () => {
      const res = await getAdminTransaction(accessToken!, id!);
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error('No data');
      return res.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (body: Parameters<typeof patchAdminTransaction>[2]) => {
      if (!id) throw new Error('Missing transaction id');
      const res = await patchAdminTransaction(accessToken!, id, body);
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error('Empty response');
      return res.data;
    },
    onError: (e: Error) => toast.error(e.message),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tx'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'pendingTx'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const handleConfirmReceipt = () => {
    mutation.mutate(
      { confirmReceipt: true },
      {
        onSuccess: () => {
          toast.success('Receipt confirmed. Upload delivery proof when the payout is done.')
          void txQuery.refetch()
        },
      },
    )
  }

  const handleDownloadPop = async () => {
    if (!accessToken || !id) return
    const path = txQuery.data?.popPath
    if (!path) return
    const name = filenameFromPath(path) || 'proof-of-payment'
    setPopDownloading(true)
    const res = await downloadTransactionPop(id, accessToken, name)
    setPopDownloading(false)
    if (res.error) toast.error(res.error.message)
  }

  const handleSaveAndNotify = () => {
    if (!file) {
      toast.error('Choose a delivery proof file first.');
      return;
    }
    const body: Parameters<typeof patchAdminTransaction>[2] = {
      status: 'completed',
      delivery_proof: file,
    }
    if (!txQuery.data?.receiptConfirmed) body.confirmReceipt = true
    mutation.mutate(body, {
      onSuccess: () => {
        toast.success('Delivery proof saved. Transfer marked as completed.')
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        navigate(adminPendingPath)
      },
    })
  }

  if (!accessToken) {
    return <p className="text-sm text-muted-foreground">Sign in as admin.</p>;
  }

  if (!id) {
    return <p className="text-sm text-destructive">Missing transaction id.</p>;
  }

  if (txQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (txQuery.isError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{(txQuery.error as Error).message}</p>
        <Button asChild variant="outline" size="sm">
          <Link to={adminPendingPath}>← Back to queue</Link>
        </Button>
      </div>
    );
  }

  const tx = txQuery.data;
  if (!tx) return null;

  const popUrl = tx.popPath ? mediaHref(tx.popPath) : null;
  const popImage = isImagePath(tx.popPath);
  const popName = filenameFromPath(tx.popPath);

  const isFinal = tx.status === 'completed' || tx.status === 'rejected';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Transaction</h2>
          <p className="font-mono text-xs text-muted-foreground">{tx.id}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={adminPendingPath}>← Back to queue</Link>
        </Button>
      </div>

      <Card>
        <CardHeader title="Summary" subtitle={tx.mode === 'russia-zambia' ? 'Russia → Zambia' : 'Zambia → Russia'} />
        <CardContent className="divide-y divide-border">
          <SummaryRow label="Status" value={<StatusBadge status={tx.status} />} />
          <SummaryRow
            label="Sender"
            value={
              senderSecondaryLine(tx)
                ? `${senderDisplay(tx)} (${senderSecondaryLine(tx)})`
                : senderDisplay(tx)
            }
          />
          <SummaryRow label="Recipient" value={recipientDisplay(tx)} />
          <SummaryRow
            label="Amount"
            mono
            value={
              <>
                {formatMoneyAmount(tx.inputAmount, tx.inputCurrency)} →{' '}
                {formatMoneyAmount(tx.resultAmount, tx.resultCurrency)}
              </>
            }
          />
          <SummaryRow label="Payment method" value={paymentLabel(tx.paymentMethod)} />
          <SummaryRow
            label="Receive via"
            value={deliveryLabel(recipientReceiveMethod(tx) ?? tx.deliveryMethod)}
          />
          {recipientPayoutDetailRows(tx).map(row => (
            <SummaryRow key={row.label} label={row.label} value={row.value} mono={row.label === 'Account number'} />
          ))}
          <SummaryRow label="Created" value={new Date(tx.createdAt).toLocaleString()} />
          <SummaryRow label="Updated" value={new Date(tx.updatedAt).toLocaleString()} />
          {tx.purpose ? <SummaryRow label="Purpose" value={tx.purpose} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Proof of payment"
          subtitle={popUrl ? 'Uploaded by the client' : 'Client has not uploaded a POP yet'}
        />
        <CardContent>
          {popUrl ? (
            <div className="space-y-3">
              {popImage ? (
                <img
                  src={popUrl}
                  alt="Client proof of payment"
                  className="max-h-[480px] w-full rounded-md border border-border bg-muted object-contain"
                />
              ) : (
                <div className="rounded-md border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{popName || 'Uploaded file'}</p>
                  <p className="mt-1 text-xs">Open or download to inspect.</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={popUrl} target="_blank" rel="noopener noreferrer">
                    Open in new tab
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={popDownloading}
                  aria-busy={popDownloading}
                  onClick={() => void handleDownloadPop()}
                >
                  {popDownloading ? 'Downloading…' : 'Download'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No file yet.</p>
          )}
        </CardContent>
      </Card>

      {!isFinal ? (
        <Card>
          <CardHeader title="Actions" subtitle="Confirm the transfer or attach delivery proof." />
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Confirm receipt</p>
              <p className="text-xs text-muted-foreground">
                Acknowledge that you have verified the client&apos;s proof of payment. You can then upload delivery
                proof below to complete the transfer.
              </p>
              <Button
                type="button"
                onClick={handleConfirmReceipt}
                disabled={mutation.isPending || !popUrl}
              >
                Confirm receipt
              </Button>
              {!popUrl ? (
                <p className="text-xs text-muted-foreground">
                  Wait for the client to upload proof of payment before confirming.
                </p>
              ) : null}
            </div>

            <div className="space-y-2 border-t border-border pt-6">
              <label htmlFor="receipt-file" className="text-sm font-medium text-foreground">
                Upload delivery proof
              </label>
              <p className="text-xs text-muted-foreground">
                Image (JPEG/PNG/WebP) or PDF — sent to the client when you save.
              </p>
              <input
                id="receipt-file"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="block w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                type="button"
                onClick={handleSaveAndNotify}
                disabled={mutation.isPending || !file}
              >
                Save and notify
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Actions" subtitle="This transfer is already finalised." />
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Status is <StatusBadge status={tx.status} />. No further action is required here.
            </p>
            {tx.receiptPath ? (
              <p className="mt-3 text-sm">
                <a
                  href={mediaHref(tx.receiptPath)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  View saved delivery proof
                </a>
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
