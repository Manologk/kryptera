import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getTransaction, uploadPop } from '@/services/api';
import { DELIVERY_OPTIONS, PAYMENT_OPTIONS } from '@/constants/transferPlaceholders';
import { ROUTES, transferConfirmation } from '@/constants/routes';
import { formatMoneyAmount } from '@/features/transaction/utils';
import { filenameFromPath, isImagePath, mediaHref } from '@/lib/media';
import type { Transaction, TransactionStatus } from '@/types';
import Button from '@/components/ui/Button';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import Layout, { PageHeader } from '@/components/layout/Layout';
import { Alert, StatusBadge } from '@/components/ui/Badge';

const POLL_INTERVAL_MS = 10_000;

const TERMINAL_STATUSES: ReadonlySet<TransactionStatus> = new Set(['completed', 'rejected']);

function deliveryLabel(id: string | undefined): string {
  if (!id) return '—';
  return DELIVERY_OPTIONS.find(o => o.id === id)?.title ?? id;
}

function paymentLabel(id: string | undefined): string {
  if (!id) return '—';
  return PAYMENT_OPTIONS.find(o => o.id === id)?.title ?? id;
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
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
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
    const handle = window.setInterval(() => {
      void fetchTx();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(handle);
  }, [tx, fetchTx]);

  const status = tx?.status;
  const isCompleted = status === 'completed';
  const showUpload =
    !!tx && (status === 'pending' || status === 'pop_not_uploaded') && !tx.popPath;
  const showAwaitingMessage = status === 'awaiting_confirmation' || status === 'pending_verification';

  async function handleSubmitProof(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !accessToken || !txId) return;
    setUploadError(null);
    setUploading(true);
    const res = await uploadPop(txId, file, accessToken);
    setUploading(false);
    if (res.error) {
      setUploadError(res.error.message);
      return;
    }
    if (res.data) {
      setTx(res.data);
      setFile(null);
    }
  }

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

      {showUpload ? (
        <Card>
          <CardHeader title="Waiting for your proof of payment" subtitle="Upload a screenshot or PDF of your payment to continue." />
          <CardContent className="pt-0">
            {uploadError ? (
              <div style={{ marginBottom: 16 }}>
                <Alert type="error" message={uploadError} onClose={() => setUploadError(null)} />
              </div>
            ) : null}
            <form onSubmit={e => void handleSubmitProof(e)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label
                  htmlFor="pop-file"
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-muted)',
                    marginBottom: 8,
                  }}
                >
                  File
                </label>
                <input
                  id="pop-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  style={{
                    width: '100%',
                    fontSize: 14,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                  }}
                />
              </div>
              <Button type="submit" size="lg" loading={uploading} disabled={!file || uploading}>
                Submit proof
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isCompleted ? (
        <Card style={{ marginBottom: 20 }}>
          <CardHeader title="Delivery proof" />
          <CardContent className="pt-0">
            {deliveryProofUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {deliveryProofIsImage ? (
                  <img
                    src={deliveryProofUrl}
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
                    <a href={deliveryProofUrl} download={deliveryProofFileName || 'delivery-proof'}>
                      Download delivery proof
                    </a>
                  </Button>
                </div>
                {tx.deliveryNotes != null && String(tx.deliveryNotes).trim() !== '' ? (
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
            ) : (
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                No delivery proof was attached for this transfer.
              </p>
            )}
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
