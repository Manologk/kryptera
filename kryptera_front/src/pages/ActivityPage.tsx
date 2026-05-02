import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES, activityTransaction } from '@/constants/routes';
import { useTransactions } from '@/features/transaction/hooks';
import { downloadTransactionRecordText } from '@/features/transaction/transactionDownload';
import { RecipientStackedCell, TxRowActions, TxTableCheckbox } from '@/features/transaction/TransactionTableUi';
import { formatMoneyAmount } from '@/features/transaction/utils';
import Card, { CardHeader } from '@/components/ui/Card';
import Layout, { PageHeader } from '@/components/layout/Layout';
import { StatusBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types';

function formatListDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ActivityPage() {
  const { transactions, isApi, remoteLoading } = useTransactions();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSelected(prev => {
      const ids = new Set(transactions.map(t => t.id));
      const next = new Set<string>();
      prev.forEach(id => {
        if (ids.has(id)) next.add(id);
      });
      return next;
    });
  }, [transactions]);

  const sortedForDisplay = useMemo(() => transactions, [transactions]);

  const allSelected =
    sortedForDisplay.length > 0 && sortedForDisplay.every(t => selected.has(t.id));
  const someSelected =
    sortedForDisplay.some(t => selected.has(t.id)) && !allSelected;

  const toggleRow = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleHeaderPress = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(sortedForDisplay.map(t => t.id)));
  };

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
          <div className="overflow-hidden rounded-[14px] border border-[#EBEBEB] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead className="border-b border-[#EBEBEB] bg-[#F7F7F5]">
                  <tr className="h-10">
                    <th className="w-12 px-2 text-center align-middle">
                      <div className="flex justify-center">
                        <TxTableCheckbox
                          checked={allSelected}
                          indeterminate={someSelected}
                          ariaLabel="Select all transfers"
                          onPress={handleHeaderPress}
                        />
                      </div>
                    </th>
                    <th className="px-3 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]">
                      Recipient
                    </th>
                    <th className="px-3 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]">
                      Amount
                    </th>
                    <th className="px-3 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]">
                      Date
                    </th>
                    <th className="px-3 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#888]">
                      Status
                    </th>
                    <th className="w-[72px] px-0 text-center align-middle" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {sortedForDisplay.map(tx => (
                    <ActivityTableRow
                      key={tx.id}
                      tx={tx}
                      selected={selected.has(tx.id)}
                      onToggle={() => toggleRow(tx.id)}
                      onDownload={() => downloadTransactionRecordText(tx)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </Layout>
  );
}

function ActivityTableRow({
  tx,
  selected,
  onToggle,
  onDownload,
}: {
  tx: Transaction;
  selected: boolean;
  onToggle: () => void;
  onDownload: () => void;
}) {
  return (
    <tr
      className={cn(
        'min-h-[64px] border-b border-[#EBEBEB] transition-colors duration-150',
        selected ? 'bg-[#F0FAF5] hover:bg-[#F0FAF5]' : 'bg-white hover:bg-[#F7F7F5]',
      )}
    >
      <td className="w-12 px-2 text-center align-middle">
        <div className="flex min-h-[64px] items-center justify-center">
          <TxTableCheckbox
            checked={selected}
            ariaLabel="Select transfer"
            onCheckedChange={() => onToggle()}
          />
        </div>
      </td>
      <td className="px-3 align-middle">
        <RecipientStackedCell tx={tx} includeReference={false} />
      </td>
      <td className="px-3 align-middle">
        <span className="text-[14px] font-medium leading-snug text-[#163300]">
          {formatMoneyAmount(tx.inputAmount, tx.inputCurrency)}
          <span className="mx-1 text-[#888]">→</span>
          {formatMoneyAmount(tx.resultAmount, tx.resultCurrency)}
        </span>
      </td>
      <td className="px-3 align-middle text-[13px] font-normal text-[#888]">
        {formatListDate(tx.createdAt)}
      </td>
      <td className="px-3 align-middle">
        <StatusBadge status={tx.status} />
      </td>
      <td className="w-[72px] px-0 align-middle">
        <TxRowActions detailHref={activityTransaction(tx.id)} onDownloadRecord={onDownload} />
      </td>
    </tr>
  );
}
