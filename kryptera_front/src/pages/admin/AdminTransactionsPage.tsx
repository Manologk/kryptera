import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ROUTES, activityTransaction } from '@/constants/routes';
import { ADMIN_PAGE_SIZE } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { adminKeys } from '@/features/admin/queryKeys';
import { recipientDisplay, TRANSACTION_STATUS_FILTER_OPTIONS, transactionStatusLabel } from '@/features/admin/transactionLabels';
import { formatMoneyAmount } from '@/features/transaction/utils';
import { getAdminTransactions, patchAdminTransaction } from '@/services/api';
import type { Transaction, TransactionStatus } from '@/types';
import { Button } from '@/components/ui/button';
import Card, { CardContent, CardHeader } from '@/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

const STATUSES: TransactionStatus[] = [
  'pop_not_uploaded',
  'pending_verification',
  'completed',
  'rejected',
];

export default function AdminTransactionsPage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState('');
  const [createdAfter, setCreatedAfter] = useState('');
  const [createdBefore, setCreatedBefore] = useState('');
  const [applied, setApplied] = useState({
    search: '',
    status: '',
    user: '',
    created_after: '',
    created_before: '',
  });
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState<TransactionStatus>('pending_verification');

  const filterKey = useMemo(
    () => ({
      search: applied.search,
      status: applied.status,
      user: applied.user,
      created_after: applied.created_after,
      created_before: applied.created_before,
    }),
    [applied],
  );

  const listQuery = useQuery({
    queryKey: adminKeys.transactions(page, filterKey),
    enabled: !!accessToken,
    queryFn: async () => {
      const res = await getAdminTransactions(accessToken!, {
        page,
        search: applied.search || undefined,
        status: applied.status || undefined,
        user: applied.user || undefined,
        created_after: applied.created_after || undefined,
        created_before: applied.created_before || undefined,
      });
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error('No data');
      return res.data;
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: { status?: TransactionStatus; admin_note?: string };
    }) => {
      const res = await patchAdminTransaction(accessToken!, id, body);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tx'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function applyFilters() {
    setApplied({
      search: search.trim(),
      status,
      user: userId.trim(),
      created_after: createdAfter ? new Date(createdAfter).toISOString() : '',
      created_before: createdBefore ? new Date(createdBefore).toISOString() : '',
    });
    setPage(1);
  }

  function openDetail(tx: Transaction) {
    setDetailTx(tx);
    setNoteDraft(tx.adminNote ?? '');
    setStatusDraft(tx.status);
  }

  function saveDetail() {
    if (!detailTx) return;
    const statusChanged = statusDraft !== detailTx.status;
    const noteChanged = noteDraft !== (detailTx.adminNote ?? '');
    if (!statusChanged && !noteChanged) {
      toast.message('No changes to save');
      return;
    }
    patchMutation.mutate(
      {
        id: detailTx.id,
        body: {
          status: statusChanged ? statusDraft : undefined,
          admin_note: noteChanged ? noteDraft : undefined,
        },
      },
      {
        onSuccess: data => {
          toast.success('Transaction updated');
          setDetailTx(data ?? null);
          if (data) {
            setNoteDraft(data.adminNote ?? '');
            setStatusDraft(data.status);
          }
        },
      },
    );
  }

  if (!accessToken) {
    return <p className="text-sm text-muted-foreground">Sign in as admin.</p>;
  }

  const rows = listQuery.data?.results ?? [];
  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.count / ADMIN_PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Transactions</h2>
        <p className="text-sm text-muted-foreground">
          Filter and update transfer status. End users keep read-only activity views.
        </p>
      </div>

      <Card>
        <CardHeader title="Filters" />
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="tx-search">Search</Label>
              <Input
                id="tx-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Email, purpose, or UUID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-status">Status</Label>
              <select
                id="tx-status"
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Any</option>
                {TRANSACTION_STATUS_FILTER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-user">User ID</Label>
              <Input id="tx-user" value={userId} onChange={e => setUserId(e.target.value)} placeholder="Numeric" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-after">Created after (local)</Label>
              <Input
                id="tx-after"
                type="datetime-local"
                value={createdAfter}
                onChange={e => setCreatedAfter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-before">Created before (local)</Label>
              <Input
                id="tx-before"
                type="datetime-local"
                value={createdBefore}
                onChange={e => setCreatedBefore(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" onClick={applyFilters} disabled={listQuery.isFetching}>
            Apply filters
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Results" subtitle={`${listQuery.data?.count ?? '—'} total`} />
        <CardContent>
          {listQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : listQuery.isError ? (
            <p className="text-sm text-destructive">{(listQuery.error as Error).message}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions match.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sender</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="max-w-[180px] truncate text-sm" title={tx.userEmail}>
                      {tx.userEmail ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate text-sm">{recipientDisplay(tx)}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-sm">
                      {formatMoneyAmount(tx.inputAmount, tx.inputCurrency)} →{' '}
                      {formatMoneyAmount(tx.resultAmount, tx.resultCurrency)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={tx.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => openDetail(tx)}>
                          Detail
                        </Button>
                        <Button type="button" variant="ghost" size="sm" asChild>
                          <Link to={activityTransaction(tx.id)}>Public view</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {listQuery.data != null && totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || listQuery.isFetching}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || listQuery.isFetching}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-sm">
        <Link to={ROUTES.activity} className="font-medium text-primary underline-offset-4 hover:underline">
          ← Public activity
        </Link>
      </p>

      <Dialog open={!!detailTx} onOpenChange={open => !open && setDetailTx(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction</DialogTitle>
          </DialogHeader>
          {detailTx ? (
            <div className="space-y-4 text-sm">
              <p className="font-mono text-xs text-muted-foreground">{detailTx.id}</p>
              <p>
                <span className="text-muted-foreground">Sender</span>
                <br />
                {detailTx.userEmail ?? '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Recipient</span>
                <br />
                {recipientDisplay(detailTx)}
              </p>
              <p className="font-mono">
                {formatMoneyAmount(detailTx.inputAmount, detailTx.inputCurrency)} →{' '}
                {formatMoneyAmount(detailTx.resultAmount, detailTx.resultCurrency)}
              </p>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={statusDraft}
                  onChange={e => setStatusDraft(e.target.value as TransactionStatus)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>
                      {transactionStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-note">Admin note</Label>
                <Textarea id="admin-note" value={noteDraft} onChange={e => setNoteDraft(e.target.value)} rows={4} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={saveDetail} disabled={patchMutation.isPending || !detailTx}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
