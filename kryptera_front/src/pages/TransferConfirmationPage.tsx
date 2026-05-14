import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getTransaction } from '@/services/api';
import { PendingTransaction } from '@/features/transfer/PendingTransaction';
import { ProofOfPaymentCard } from '@/features/transfer/ProofOfPaymentCard';
import { getDeliveryMethodTitle, getPaymentMethodTitle } from '@/constants/transferPlaceholders';
import { ROUTES, transferConfirmation } from '@/constants/routes';
import { formatMoneyAmount } from '@/features/transaction/utils';
import { filenameFromPath, isImagePath, mediaHref } from '@/lib/media';
import type { Transaction, TransactionStatus } from '@/types';
import Button from '@/components/ui/button';
import Card, { CardContent, CardHeader } from '@/components/ui/card';
import Layout, { PageHeader } from '@/components/layout/Layout';
import { Alert, StatusBadge } from '@/components/ui/badge';

const POLL_INTERVAL_MS = 10_000;
const POLL_FAST_MS = 2_000;

const TERMINAL_STATUSES: ReadonlySet<TransactionStatus> = new Set(['completed', 'rejected', 'canceled']);

function deliveryLabel(id: string | undefined): string {
  return getDeliveryMethodTitle(id);
}

function paymentLabel(id: string | undefined): string {
  return getPaymentMethodTitle(id);
}

function recipientLine(tx: Transaction): string {
  if (tx.recipient) {
    return tx.recipient.fullName || '—';
  }
  const s = tx.recipientSnapshot;
  if (!s) return '—';
  return s.full_name || s.email || s.phone_number || s.phone || '—';
}

function corridorLabel(mode: Transaction['mode']): string {
  return mode === 'russia-zambia' ? 'Russia → Zambia' : 'Zambia → Russia';
}

export default function TransferConfirmationPage() {
  const { txId } = useParams<{ txId: string }>();
  const { accessToken, isAuthenticated } = useAuth();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const fetchTx = useCallback(async () => {
    if (!txId || !accessToken) return;
    const res = await getTransaction(accessToken, txId);
    if (cancelledRef.current) return;
    if (res.error || !res.data) {
      setLoadError(res.error?.message ?? 'Could not load this transfer.');
      return;
    }
    setLoadError(null);
    setTx(res.data);
  }, [accessToken, txId]);

  useEffect(() => {
    cancelledRef.current = false;
    void fetchTx();
    return () => {
      cancelledRef.current = true;
    };
  }, [fetchTx]);

  useEffect(() => {
    if (!tx || TERMINAL_STATUSES.has(tx.status)) return;
    const useFastPoll =
      Boolean(tx.proofDeadlineAt || tx.paymentDeadlineAt) &&
      (tx.status === 'pending' || tx.status === 'pop_not_uploaded') &&
      !tx.popPath;
    const interval = useFastPoll ? POLL_FAST_MS : POLL_INTERVAL_MS;
    const handle = window.setInterval(() => {
      void fetchTx();
    }, interval);
    return () => window.clearInterval(handle);
  }, [tx?.id, tx?.status, tx?.proofDeadlineAt, tx?.paymentDeadlineAt, tx?.popPath, fetchTx]);

  const status = tx?.status;
  const isCompleted = status === 'completed';
  const isCanceled = status === 'canceled';
  const receiptLocked = Boolean(tx?.receiptConfirmed);
  const mayUploadOrReplacePop =
    !!tx &&
    status != null &&
    !TERMINAL_STATUSES.has(status) &&
    status !== 'rejected' &&
    !receiptLocked &&
    (status === 'pending' ||
      status === 'pop_not_uploaded' ||
      status === 'awaiting_confirmation' ||
      status === 'pending_verification');
  const showUpload = mayUploadOrReplacePop;
  const showPopPreviewCard =
    Boolean(tx?.popPath) &&
    (showUpload || status === 'awaiting_confirmation' || status === 'pending_verification');
  const showAwaitingMessage =
    (status === 'awaiting_confirmation' || status === 'pending_verification') &&
    Boolean(tx?.popPath) &&
    !showUpload;

  if (!isAuthenticated) {
    return (
      <Layout maxWidth={560}>
        <PageHeader title="Transfer" />
        <p style={{ color: 'var(--color-text-muted)' }}>
          <Link to={ROUTES.login} state={{ from: txId ? transferConfirmation(txId) : ROUTES.home }} style={{ fontWeight: 600 }}>
            Sign in
          </Link>{' '}
          to view this page.
        </p>
      </Layout>
    );
  }

  if (loadError && !tx) {
    return (
      <Layout maxWidth={560}>
        <PageHeader title="Transfer" />
        <p style={{ color: 'var(--color-error)' }}>{loadError}</p>
        <p style={{ marginTop: 12 }}>
          <Link to={ROUTES.home} style={{ fontWeight: 600 }}>
            ← Home
          </Link>
        </p>
      </Layout>
    );
  }

  if (!tx) {
    return (
      <Layout maxWidth={560}>
        <PageHeader title="Transfer" />
        <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      </Layout>
    );
  }

  const deliveryProofPath = tx.deliveryProofPath ?? tx.receiptPath;
  const deliveryProofUrl = deliveryProofPath ? mediaHref(deliveryProofPath) : null;
  const deliveryProofIsImage = isImagePath(deliveryProofPath);
  const deliveryProofFileName = filenameFromPath(deliveryProofPath);
  const showDeliveryProofToSender = Boolean(deliveryProofUrl) && tx.status !== 'rejected';

  return (
    <Layout maxWidth={560}>
      <PageHeader title="Your transfer" subtitle={corridorLabel(tx.mode)} />

      {isCompleted ? (
        <div
          role="status"
          style={{
            marginBottom: 20,
            padding: '14px 16px',
            borderRadius: 'var(--radius-md)',
            background: '#E1F5EE',
            color: '#0F6E56',
            fontWeight: 600,
          }}
        >
          ✓ Transfer complete
        </div>
      ) : null}

      {isCanceled ? (
        <div style={{ marginBottom: 20 }}>
          <Alert
            type="error"
            message="This transfer was canceled because proof of payment was not uploaded before the deadline. Start a new transfer if you still need to send money."
          />
        </div>
      ) : null}

      <Card elevated style={{ marginBottom: 20 }}>
        <CardHeader title="Summary" />
        <CardContent className="space-y-4 pt-0">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              paddingBottom: 12,
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>You send</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {formatMoneyAmount(tx.inputAmount, tx.inputCurrency)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              paddingBottom: 12,
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Recipient gets</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {formatMoneyAmount(tx.resultAmount, tx.resultCurrency)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              paddingBottom: 12,
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Recipient</span>
            <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: '100%' }}>{recipientLine(tx)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              paddingBottom: 12,
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Delivery</span>
            <span style={{ fontWeight: 600, textAlign: 'right' }}>{deliveryLabel(tx.deliveryMethod)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              paddingBottom: 12,
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Your payment</span>
            <span style={{ fontWeight: 600, textAlign: 'right' }}>{paymentLabel(tx.paymentMethod)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Status</span>
            <StatusBadge status={tx.status} />
          </div>
        </CardContent>
      </Card>

      {showAwaitingMessage ? (
        <div style={{ marginBottom: 20 }}>
          <Alert
            type="success"
            message="Proof received. We are confirming your transfer."
          />
        </div>
      ) : null}

      {showPopPreviewCard && !(showUpload && accessToken) ? (
        <div style={{ marginBottom: 20 }}>
          <ProofOfPaymentCard
            transaction={tx}
            accessToken={accessToken ?? undefined}
            subtitle={
              showUpload
                ? 'You can open, download, or replace it with a new file below once you sign in.'
                : 'Open or download the file you uploaded.'
            }
          />
        </div>
      ) : null}

      {showUpload && accessToken ? (
        <div style={{ marginBottom: 20 }}>
          <PendingTransaction
            transaction={tx}
            accessToken={accessToken}
            onTransactionUpdated={setTx}
            onTimerExpired={() => void fetchTx()}
          />
        </div>
      ) : null}

      {showDeliveryProofToSender ? (
        <Card style={{ marginBottom: 20 }}>
          <CardHeader
            title="Delivery proof"
            subtitle={
              isCompleted ? undefined : 'Your transfer is still being processed. You can download the document the team attached.'
            }
          />
          <CardContent className="pt-0">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {deliveryProofIsImage ? (
                <img
                  src={deliveryProofUrl!}
                  alt="Delivery proof"
                  style={{
                    width: '100%',
                    maxHeight: 360,
                    objectFit: 'contain',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                  }}
                />
              ) : null}
              <div>
                <Button asChild variant="secondary">
                  <a href={deliveryProofUrl!} download={deliveryProofFileName || 'delivery-proof'}>
                    Download delivery proof
                  </a>
                </Button>
              </div>
              {isCompleted && tx.deliveryNotes != null && String(tx.deliveryNotes).trim() !== '' ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {tx.deliveryNotes}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : isCompleted ? (
        <Card style={{ marginBottom: 20 }}>
          <CardHeader title="Delivery proof" />
          <CardContent className="pt-0">
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
              No delivery proof was attached for this transfer.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <p style={{ marginTop: 24, fontSize: 14 }}>
        <Link to={ROUTES.activity} style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>
          View all activity
        </Link>
      </p>
    </Layout>
  );
}
