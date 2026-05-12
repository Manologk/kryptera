import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TRANSACTION_TABLE_PAGE_SIZE } from '@/constants';
import { ROUTES, activityTransaction } from '@/constants/routes';
import { recipientDisplay } from '@/features/admin/transactionLabels';
import { useTransactions } from '@/features/transaction/hooks';
import { transactionReferenceDisplay } from '@/features/transaction/transactionReference';
import { RecipientStackedCell, TxRowDetailLink, TxTableCheckbox } from '@/features/transaction/TransactionTableUi';
import { formatMoneyAmount } from '@/features/transaction/utils';
import Card, { CardHeader } from '@/components/ui/card';
import Layout, { PageHeader } from '@/components/layout/Layout';
import { StatusBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Transaction, TransactionStatus } from '@/types';
import Button from '@/components/ui/button';

function formatListDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

const STATUS_FILTER_OPTIONS: { value: 'all' | TransactionStatus; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'pop_not_uploaded', label: 'Awaiting POP' },
  { value: 'awaiting_confirmation', label: 'Awaiting confirmation' },
  { value: 'pending_verification', label: 'Pending verification' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Declined' },
  { value: 'canceled', label: 'Canceled' },
];

export default function ActivityPage() {
  const { transactions, isApi, remoteLoading } = useTransactions();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const searchTrim = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    let list = transactions;
    if (statusFilter !== 'all') {
      list = list.filter(t => t.status === statusFilter);
    }
    if (searchTrim) {
      list = list.filter(t => {
        const name = recipientDisplay(t).toLowerCase();
        const ref = transactionReferenceDisplay(t).toLowerCase();
        const id = String(t.id).toLowerCase();
        return (
          name.includes(searchTrim) ||
          ref.includes(searchTrim) ||
          id.includes(searchTrim) ||
          (t.userEmail?.toLowerCase().includes(searchTrim) ?? false)
        );
      });
    }
    return list;
  }, [transactions, statusFilter, searchTrim]);

  useEffect(() => {
    setSelected(prev => {
      const ids = new Set(filtered.map(t => t.id));
      const next = new Set<string>();
      prev.forEach(id => {
        if (ids.has(id)) next.add(id);
      });
      return next;
    });
  }, [filtered]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchTrim]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / TRANSACTION_TABLE_PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageSlice = useMemo(() => {
    const start = (page - 1) * TRANSACTION_TABLE_PAGE_SIZE;
    return filtered.slice(start, start + TRANSACTION_TABLE_PAGE_SIZE);
  }, [filtered, page]);

  const allSelected =
    pageSlice.length > 0 && pageSlice.every(t => selected.has(t.id));
  const someSelected = pageSlice.some(t => selected.has(t.id)) && !allSelected;

  const toggleRow = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleHeaderPress = () => {
    const ids = pageSlice.map(t => t.id);
    const allPageSelected = ids.length > 0 && ids.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * TRANSACTION_TABLE_PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * TRANSACTION_TABLE_PAGE_SIZE, filtered.length);

  return (
    <Layout maxWidth={960}>
      <PageHeader title="Activity" subtitle="Recent transfers" />

      {remoteLoading ? (
        <Card subtle className="p-6">
          <p className="m-0 text-[15px] text-muted">Loading transfers…</p>
        </Card>
      ) : transactions.length === 0 ? (
        <Card subtle className="p-6">
          <p className="m-0 text-[15px] leading-[1.55] text-muted">
            {isApi
              ? 'Nothing here yet. Record a transfer from Send money while signed in.'
              : 'Nothing here yet. Sign in to load transfers from your account, or record transfers on this device only (not synced).'}
          </p>
          <p className="mt-4 mb-0">
            <Link
              to={ROUTES.home}
              className="inline-flex items-center font-semibold text-[14px] text-primary-dark"
            >
              Send money →
            </Link>
          </p>
        </Card>
      ) : (
        <Card className="p-6">
          <CardHeader title="Transfers" subtitle={`${filtered.length} shown · ${transactions.length} total`} />
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[160px] flex-1">
              <label htmlFor="activity-search" className="text-xs font-medium text-[#888]">
                Search
              </label>
              <input
                id="activity-search"
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, reference, id…"
                className="mt-1 flex h-10 w-full rounded-[10px] border border-[#EBEBEB] bg-white px-3 text-sm text-[#163300] placeholder:text-[#888] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163300]/25"
              />
            </div>
            <div className="min-w-[180px]">
              <label htmlFor="activity-status" className="text-xs font-medium text-[#888]">
                Status
              </label>
              <select
                id="activity-status"
                value={statusFilter}
                onChange={e =>
                  setStatusFilter(e.target.value as 'all' | TransactionStatus)
                }
                className="mt-1 flex h-10 w-full rounded-[10px] border border-[#EBEBEB] bg-white px-3 text-sm text-[#163300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163300]/25"
              >
                {STATUS_FILTER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
                          ariaLabel="Select all on this page"
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
                    <th className="min-w-[52px] px-0 text-center align-middle" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {pageSlice.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#888]">
                        No transfers match your filters.
                      </td>
                    </tr>
                  ) : (
                    pageSlice.map(tx => (
                      <ActivityTableRow
                        key={tx.id}
                        tx={tx}
                        selected={selected.has(tx.id)}
                        onToggle={() => toggleRow(tx.id)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground m-0">
                {rangeStart}–{rangeEnd} of {filtered.length}
                {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : null}
              </p>
              {totalPages > 1 ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth={false}
                    className="min-w-[120px]"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth={false}
                    className="min-w-[120px]"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      )}
    </Layout>
  );
}

function ActivityTableRow({
  tx,
  selected,
  onToggle,
}: {
  tx: Transaction;
  selected: boolean;
  onToggle: () => void;
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
          <TxTableCheckbox checked={selected} ariaLabel="Select transfer" onCheckedChange={() => onToggle()} />
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
      <td className="min-w-[52px] px-0 align-middle">
        <TxRowDetailLink detailHref={activityTransaction(tx.id)} />
      </td>
    </tr>
  );
}
