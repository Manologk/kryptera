import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { getTransaction } from '@/services/api';
import { formatMoneyAmount } from '@/features/transaction/utils';
import type { Transaction } from '@/types';
import Card, { CardHeader } from '@/components/ui/Card';
import Layout, { PageHeader } from '@/components/layout/Layout';
import { StatusBadge } from '@/components/ui/Badge';

function corridorLabel(mode: Transaction['mode']): string {
  return mode === 'russia-zambia' ? 'Russia → Zambia' : 'Zambia → Russia';
}

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accessToken, isAuthenticated } = useAuth();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !accessToken) return;
    let cancelled = false;
    void (async () => {
      const res = await getTransaction(accessToken, id);
      if (cancelled) return;
      if (res.error || !res.data) {
        setError(res.error?.message ?? 'Could not load transfer.');
        return;
      }
      setTx(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, accessToken]);

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
    );
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
    );
  }

  if (!tx) {
    return (
      <Layout maxWidth={640}>
        <PageHeader title="Transfer detail" />
        <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
      </Layout>
    );
  }

  const bd = tx.conversionBreakdown;

  return (
    <Layout maxWidth={640}>
      <PageHeader title="Transfer detail" subtitle={corridorLabel(tx.mode)} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <StatusBadge status={tx.status} />
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          {new Date(tx.createdAt).toLocaleString()}
        </span>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader title="Amounts" />
        <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', margin: 0 }}>
          {formatMoneyAmount(tx.inputAmount, tx.inputCurrency)}
          <span style={{ color: 'var(--color-text-muted)', margin: '0 8px' }}>→</span>
          {formatMoneyAmount(tx.resultAmount, tx.resultCurrency)}
        </p>
        {tx.purpose ? (
          <p style={{ marginTop: 12, fontSize: 15 }}>{tx.purpose}</p>
        ) : null}
      </Card>

      {tx.recipient || tx.recipientSnapshot ? (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader title="Recipient" />
          <p style={{ margin: 0, fontWeight: 600 }}>
            {tx.recipient?.fullName ?? tx.recipientSnapshot?.full_name ?? '—'}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--color-text-muted)' }}>
            {[tx.recipient?.email ?? tx.recipientSnapshot?.email, tx.recipient?.phone ?? tx.recipientSnapshot?.phone]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </Card>
      ) : null}

      {bd ? (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader title="Breakdown (from stored rates)" />
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--color-text-muted)' }}>
            <li>After commission: {bd.afterCommission} {bd.inputCurrency}</li>
            <li>USD leg: {bd.usd} USD</li>
            <li>Output: {bd.final} {bd.outputCurrency}</li>
          </ul>
        </Card>
      ) : null}

      {tx.rateSnapshot ? (
        <Card subtle>
          <CardHeader title="Rate snapshot" subtitle="Frozen at creation time" />
          <pre
            style={{
              fontSize: 12,
              margin: 0,
              overflow: 'auto',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {JSON.stringify(tx.rateSnapshot, null, 2)}
          </pre>
        </Card>
      ) : null}

      <p style={{ marginTop: 24 }}>
        <Link to={ROUTES.activity} style={{ fontWeight: 600 }}>
          ← Back to activity
        </Link>
      </p>
    </Layout>
  );
}
