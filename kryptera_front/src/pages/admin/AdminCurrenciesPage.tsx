import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ADMIN_PAGE_SIZE } from '@/constants';
import { adminKeys } from '@/features/admin/queryKeys';
import {
  createAdminCurrency,
  deleteAdminCurrency,
  getAdminCurrencies,
  patchAdminCurrency,
} from '@/services/api';
import type { ApiCurrency } from '@/types';
import { Button } from '@/components/ui/button';
import Card, { CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const emptyForm = {
  code: '',
  name: '',
  symbol: '',
  flag_emoji: '',
  sort_order: '0',
  is_enabled: true,
};

export default function AdminCurrenciesPage() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editRow, setEditRow] = useState<ApiCurrency | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    symbol: '',
    flag_emoji: '',
    sort_order: '',
    is_enabled: true,
  });
  const [deleteRow, setDeleteRow] = useState<ApiCurrency | null>(null);

  const listQuery = useQuery({
    queryKey: adminKeys.currencies(page),
    enabled: !!accessToken,
    queryFn: async () => {
      const res = await getAdminCurrencies(accessToken!, page);
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error('No data');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const sort = parseInt(form.sort_order, 10);
      const body = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        symbol: form.symbol.trim(),
        flag_emoji: form.flag_emoji.trim(),
        sort_order: Number.isNaN(sort) ? 0 : sort,
        is_enabled: form.is_enabled,
      };
      if (!body.code || !body.name) throw new Error('Code and name are required');
      const res = await createAdminCurrency(accessToken!, body);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Currency created');
      setAddOpen(false);
      setForm(emptyForm);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'currencies'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: number;
      body: Record<string, unknown>;
    }) => {
      const res = await patchAdminCurrency(accessToken!, id, body);
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'currencies'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await deleteAdminCurrency(accessToken!, id);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      toast.success('Currency deleted');
      setDeleteRow(null);
      void queryClient.invalidateQueries({ queryKey: ['admin', 'currencies'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openEdit(row: ApiCurrency) {
    setEditRow(row);
    setEditForm({
      name: row.name,
      symbol: row.symbol,
      flag_emoji: row.flagEmoji,
      sort_order: String(row.sortOrder),
      is_enabled: row.isEnabled,
    });
  }

  function saveEdit() {
    if (!editRow) return;
    const sort = parseInt(editForm.sort_order, 10);
    patchMutation.mutate(
      {
        id: editRow.id,
        body: {
          name: editForm.name.trim(),
          symbol: editForm.symbol.trim(),
          flag_emoji: editForm.flag_emoji.trim(),
          sort_order: Number.isNaN(sort) ? editRow.sortOrder : sort,
          is_enabled: editForm.is_enabled,
        },
      },
      {
        onSuccess: () => {
          toast.success('Currency updated');
          setEditRow(null);
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
        <h2 className="text-2xl font-bold tracking-tight">Currencies</h2>
        <p className="text-sm text-muted-foreground">Manage codes shown on the public currency list.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setAddOpen(true)}>
          Add currency
        </Button>
      </div>

      <Card>
        <CardHeader title="All currencies" subtitle={`${listQuery.data?.count ?? '—'} total`} />
        <CardContent>
          {listQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : listQuery.isError ? (
            <p className="text-sm text-destructive">{(listQuery.error as Error).message}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No currencies on this page.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.flagEmoji} {r.code}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.name}</TableCell>
                    <TableCell>{r.sortOrder}</TableCell>
                    <TableCell>{r.isEnabled ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={patchMutation.isPending}
                          onClick={() =>
                            patchMutation.mutate(
                              { id: r.id, body: { is_enabled: !r.isEnabled } },
                              { onSuccess: () => toast.success(r.isEnabled ? 'Disabled' : 'Enabled') },
                            )
                          }
                        >
                          {r.isEnabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(r)}>
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeleteRow(r)}
                        >
                          Delete
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add currency</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-code">Code</Label>
              <Input id="c-code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-symbol">Symbol</Label>
              <Input id="c-symbol" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-flag">Flag emoji</Label>
              <Input
                id="c-flag"
                value={form.flag_emoji}
                onChange={e => setForm(f => ({ ...f, flag_emoji: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-order">Sort order</Label>
              <Input
                id="c-order"
                type="number"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.is_enabled}
                onChange={e => setForm(f => ({ ...f, is_enabled: e.target.checked }))}
              />
              Enabled
            </label>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={open => !open && setEditRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editRow?.code}</DialogTitle>
          </DialogHeader>
          {editRow ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="e-name">Name</Label>
                <Input id="e-name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-symbol">Symbol</Label>
                <Input
                  id="e-symbol"
                  value={editForm.symbol}
                  onChange={e => setEditForm(f => ({ ...f, symbol: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-flag">Flag emoji</Label>
                <Input
                  id="e-flag"
                  value={editForm.flag_emoji}
                  onChange={e => setEditForm(f => ({ ...f, flag_emoji: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-order">Sort order</Label>
                <Input
                  id="e-order"
                  type="number"
                  value={editForm.sort_order}
                  onChange={e => setEditForm(f => ({ ...f, sort_order: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={editForm.is_enabled}
                  onChange={e => setEditForm(f => ({ ...f, is_enabled: e.target.checked }))}
                />
                Enabled
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={saveEdit} disabled={patchMutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteRow} onOpenChange={open => !open && setDeleteRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete currency</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Permanently delete <strong>{deleteRow?.code}</strong>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteRow && deleteMutation.mutate(deleteRow.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
