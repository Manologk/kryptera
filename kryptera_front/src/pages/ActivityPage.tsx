import { Link } from 'react-router-dom';
import { ROUTES, activityTransaction } from '@/constants/routes';
import { useTransactions } from '@/features/transaction/hooks';
import { formatMoneyAmount } from '@/features/transaction/utils';
import Card, { CardHeader } from '@/components/ui/Card';
import Layout, { PageHeader } from '@/components/layout/Layout';
import { StatusBadge } from '@/components/ui/Badge';
import type { Transaction } from '@/types';

function corridorLabel(mode: Transaction['mode']): string {
  return mode === 'russia-zambia' ? 'Russia → Zambia' : 'Zambia → Russia';
}

export default function ActivityPage() {
  const { transactions, isApi, remoteLoading } = useTransactions();

  return (
    <Layout maxWidth={960}>
      <PageHeader title="Activity" subtitle="Recent transfers" />

      {remoteLoading ? (
        <Card subtle>
          <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: 0 }}>Loading transfers…</p>
        </Card>
      ) : transactions.length === 0 ? (
        <Card subtle>
          <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55 }}>
            {isApi
              ? 'Nothing here yet. Record a transfer from Send money while signed in.'
              : 'Nothing here yet. Sign in to load transfers from your account, or record transfers on this device only (not synced).'}
          </p>
          <p style={{ marginTop: 16, marginBottom: 0 }}>
            <Link
              to={ROUTES.home}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--color-primary-dark)',
              }}
            >
              Send money →
            </Link>
          </p>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Transfers" subtitle={`${transactions.length} total`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {transactions.map((tx, i) => (
              <div
                key={tx.id}
                style={{
                  display: 'grid',
                  gap: 8,
                  padding: '18px 0',
                  borderBottom: i < transactions.length - 1 ? '1px solid var(--color-border)' : 'none',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'start',
                }}
              >
                <div>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      margin: '0 0 4px',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {formatMoneyAmount(tx.inputAmount, tx.inputCurrency)}
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 500, margin: '0 6px' }}>→</span>
                    {formatMoneyAmount(tx.resultAmount, tx.resultCurrency)}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                    {corridorLabel(tx.mode)}
                    {' · '}
                    {new Date(tx.createdAt).toLocaleString()}
                    {isApi ? (
                      <>
                        {' · '}
                        <Link
                          to={activityTransaction(tx.id)}
                          style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}
                        >
                          Details
                        </Link>
                      </>
                    ) : null}
                  </p>
                  {tx.purpose ? (
                    <p style={{ fontSize: 13, margin: '8px 0 0', color: 'var(--color-text)' }}>{tx.purpose}</p>
                  ) : null}
                </div>
                <StatusBadge status={tx.status} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </Layout>
  );
}
