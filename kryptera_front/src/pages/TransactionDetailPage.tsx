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
              <div className="flex justify-center mb-2">
                {deliveryProofIsImage ? (
                  <img
                    src={deliveryProofUrl}
                    alt="Delivery proof - preview"
                    className="rounded-md border border-solid"
                    style={{
                      width: 80,
                      height: 80,
                      objectFit: 'cover',
                      borderColor: 'var(--color-border)',
                      background: 'var(--color-surface)',
                      padding: 5,
                      marginRight: 5,
                    }}
                  />
                ) : deliveryProofFileName && deliveryProofFileName.toLowerCase().endsWith('.pdf') ? (
                  <div
                    className="flex flex-col items-center justify-center"
                    style={{
                      width: 80,
                      height: 80,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <svg width="32" height="40" viewBox="0 0 32 40" aria-label="PDF file" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="4" y="4" width="24" height="32" rx="3" fill="#F2F0EC"/>
                      <path d="M8 7C8 5.89543 8.89543 5 10 5H22C23.1046 5 24 5.89543 24 7V33C24 34.1046 23.1046 35 22 35H10C8.89543 35 8 34.1046 8 33V7Z" fill="#fff"/>
                      <text x="16" y="29" textAnchor="middle" fontSize="12" fill="#CB3837" fontWeight="bold" fontFamily="sans-serif">
                        PDF
                      </text>
                    </svg>
                    <span className="text-xs text-muted" style={{ marginTop: 4 }}>PDF</span>
                  </div>
                ) : null}
              </div>
              <div className="flex justify-center" style={{ marginBottom: 12 }}>
                <Button asChild variant="primary" className="w-fit px-6">
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
