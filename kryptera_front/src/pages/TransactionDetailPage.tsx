import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/context/AuthContext'
import { getTransaction } from '@/services/api'
import TransactionSummaryCard from '@/features/transaction/TransactionSummaryCard'
import { filenameFromPath, isImagePath, mediaHref } from '@/lib/media'
import type { Transaction } from '@/types'
import Button from '@/components/ui/Button'
import Card, { CardHeader } from '@/components/ui/Card'
import Layout, { PageHeader } from '@/components/layout/Layout'

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { accessToken, isAuthenticated } = useAuth()
  const [tx, setTx] = useState<Transaction | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !accessToken) return
    let cancelled = false
    void (async () => {
      const res = await getTransaction(accessToken, id)
      if (cancelled) return
      if (res.error || !res.data) {
        setError(res.error?.message ?? 'Could not load transfer.')
        return
      }
      setTx(res.data)
    })()
    return () => {
      cancelled = true
    }
  }, [id, accessToken])

  if (!isAuthenticated) {
    return (
      <Layout maxWidth={640}>
        <PageHeader title="Transfer detail" />
        <p style={{ color: 'var(--color-text-muted)' }}>
          <Link to={ROUTES.login} style={{ fontWeight: 600 }}>
            Sign in
          </Link>{' '}
          to view this transfer.
        </p>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout maxWidth={640}>
        <PageHeader title="Transfer detail" />
        <p style={{ color: 'var(--color-error)' }}>{error}</p>
        <p style={{ marginTop: 12 }}>
          <Link to={ROUTES.activity} style={{ fontWeight: 600 }}>
            ← Activity
          </Link>
        </p>
      </Layout>
    )
  }

  if (!tx) {
    return (
      <Layout maxWidth={640}>
        <PageHeader title="Transfer detail" />
        <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      </Layout>
    )
  }

  const deliveryProofPath = tx.deliveryProofPath ?? tx.receiptPath
  const deliveryProofUrl = deliveryProofPath ? mediaHref(deliveryProofPath) : null
  const deliveryProofIsImage = isImagePath(deliveryProofPath)
  const deliveryProofFileName = filenameFromPath(deliveryProofPath)
  const showCompletedDelivery = tx.status === 'completed'

  return (
    <Layout maxWidth={640}>
      <PageHeader title="Transfer detail" />

      <div style={{ marginBottom: 16 }}>
        <TransactionSummaryCard tx={tx} />
      </div>

      {showCompletedDelivery ? (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader title="Delivery proof" />
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
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
              No delivery proof was attached for this transfer.
            </p>
          )}
        </Card>
      ) : null}

      <p style={{ marginTop: 24 }}>
        <Link to={ROUTES.activity} style={{ fontWeight: 600 }}>
          ← Back to activity
        </Link>
      </p>
    </Layout>
  )
}
