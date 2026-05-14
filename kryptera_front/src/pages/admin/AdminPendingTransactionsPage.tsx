import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ADMIN_PAGE_SIZE } from '@/constants';
import { adminPendingDetail } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { adminKeys } from '@/features/admin/queryKeys';
import { recipientDisplay } from '@/features/admin/transactionLabels';
import { formatMoneyAmount } from '@/features/transaction/utils';
import { DELIVERY_OPTIONS, getPaymentMethodTitle } from '@/constants/transferPlaceholders';
import { getAdminTransactions } from '@/services/api';
import { Button } from '@/components/ui/button';
import Card, { CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const STATUS_IN = 'pending,awaiting_confirmation,pending_verification';

const deliveryLabel = (id: string | undefined): string => {
  if (!id) return '—';
  return DELIVERY_OPTIONS.find(o => o.id === id)?.title ?? id;
};

const paymentLabel = (id: string | undefined): string => getPaymentMethodTitle(id);

const shortId = (id: string): string => id.slice(0, 8);

export default function AdminPendingTransactionsPage() {
  const { accessToken } = useAuth();
  const [page, setPage] = useState(1);

  const listQuery = useQuery({
    queryKey: adminKeys.pendingTransactions(page),
    enabled: !!accessToken,
    refetchInterval: 15_000,
    queryFn: async () => {
      const res = await getAdminTransactions(accessToken!, {
        status_in: STATUS_IN,
        page,
      });
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error('No data');
      return res.data;
    },
  });

  if (!accessToken) {
    return <p className="text-sm text-muted-foreground">Sign in as admin.</p>;
  }

  const rows = listQuery.data?.results ?? [];
  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.count / ADMIN_PAGE_SIZE)) : 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pending verifications</h2>
        <p className="text-sm text-muted-foreground">
          Transfers awaiting admin review — pending and awaiting-confirmation only.
        </p>
      </div>

      <Card>
        <CardHeader title="Queue" subtitle={`${listQuery.data?.count ?? '—'} total`} />
        <CardContent>
          {listQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : listQuery.isError ? (
            <p className="text-sm text-destructive">{(listQuery.error as Error).message}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting. New transfers will appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tx ID</TableHead>
                    <TableHead>Sender</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs" title={tx.id}>
                        {shortId(tx.id)}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm" title={tx.userEmail}>
                        {tx.userEmail ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm">{recipientDisplay(tx)}</TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-sm">
                        {formatMoneyAmount(tx.inputAmount, tx.inputCurrency)} →{' '}
                        {formatMoneyAmount(tx.resultAmount, tx.resultCurrency)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{paymentLabel(tx.paymentMethod)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{deliveryLabel(tx.deliveryMethod)}</TableCell>
                      <TableCell>
                        <StatusBadge status={tx.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <Link to={adminPendingDetail(tx.id)}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
    </div>
  );
}
