import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRates } from '@/context/RatesContext';
import { ADMIN_PAGE_SIZE } from '@/constants';
import { adminKeys } from '@/features/admin/queryKeys';
import { rateSlugDisplay } from '@/features/admin/rateSlugLabels';
import {
  createAdminRateQuote,
  deleteAdminRateQuote,
  getAdminRateQuotes,
  patchAdminRateQuote,
  type AdminRateQuote,
} from '@/services/api';
import type { ExchangeRates } from '@/types';
import { Button } from '@/components/ui/button';
import Card, { CardContent, CardDivider, CardHeader } from '@/components/ui/Card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RateField {
  key: keyof ExchangeRates;
  label: string;
  hint: string;
  example: string;
}

const RATE_FIELDS: RateField[] = [
  {
    key: 'rubleToUsdBuying',
    label: 'Ruble → USD buying',
    hint: 'How many rubles equal $1 USD',
    example: 'e.g. 95.50',
  },
  {
    key: 'usdToKwachaSelling',
    label: 'USD → Kwacha selling',
    hint: 'Kwacha per $1 USD',
    example: 'e.g. 27.50',
  },
  {
    key: 'kwachaToUsdBuying',
    label: 'Kwacha → USD buying',
    hint: 'How many kwacha equal $1 USD',
    example: 'e.g. 28.00',
  },
  {
    key: 'usdToRubleSelling',
    label: 'USD → Ruble selling',
    hint: 'Rubles per $1 USD',
    example: 'e.g. 96.00',
  },
];

function LogicCard() {
  return (
    <Card subtle>
      <CardHeader title="Conversion logic" subtitle="How corridor rates are applied" />
      <CardContent className="space-y-5 text-sm text-muted-foreground">
        {[
          {
            title: 'Russia → Zambia',
            steps: [
              'Deduct commission from ruble amount',
              'Divide by ruble buying rate → USD',
              'Multiply by kwacha selling rate → ZMW',
            ],
          },
          {
            title: 'Zambia → Russia',
            steps: [
              'Deduct commission from kwacha amount',
              'Divide by kwacha buying rate → USD',
              'Multiply by ruble selling rate → RUB',
            ],
          },
        ].map(({ title, steps }) => (
          <div key={title}>
            <p className="mb-2 font-semibold text-foreground">{title}</p>
            <ol className="list-inside list-decimal space-y-1">
              {steps.map(step => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AdminRatesPage() {
  const { accessToken, user } = useAuth();
  const { rates, loading, saveRates } = useRates();
  const queryClient = useQueryClient();

  const [bulkForm, setBulkForm] = useState<Record<string, string>>({});
  const [savingBulk, setSavingBulk] = useState(false);
  const [bulkAlert, setBulkAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [bulkErrors, setBulkErrors] = useState<Partial<Record<keyof ExchangeRates, string>>>({});

  const [quotePage, setQuotePage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newRate, setNewRate] = useState('');
  const [editQuote, setEditQuote] = useState<AdminRateQuote | null>(null);
  const [editRate, setEditRate] = useState('');

  const quotesQuery = useQuery({
    queryKey: adminKeys.rateQuotes(quotePage),
    enabled: !!accessToken,
    queryFn: async () => {
      const res = await getAdminRateQuotes(accessToken!, quotePage);
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error('No data');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const rate = parseFloat(newRate);
      if (!newSlug.trim() || Number.isNaN(rate) || rate <= 0) throw new Error('Valid slug and positive rate required');
      const res = await createAdminRateQuote(accessToken!, { slug: newSlug.trim(), rate });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Quote created');
      setAddOpen(false);
      setNewSlug('');
      setNewRate('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'rateQuotes'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchQuoteMutation = useMutation({
    mutationFn: async ({ id, rate, is_active }: { id: number; rate?: number; is_active?: boolean }) => {
      const res = await patchAdminRateQuote(accessToken!, id, { rate, is_active });
      if (res.error) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'rateQuotes'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await deleteAdminRateQuote(accessToken!, id);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      toast.success('Quote removed or deactivated');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'rateQuotes'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (loading) return;
    setBulkForm({
      rubleToUsdBuying: String(rates.rubleToUsdBuying),
      usdToKwachaSelling: String(rates.usdToKwachaSelling),
      kwachaToUsdBuying: String(rates.kwachaToUsdBuying),
      usdToRubleSelling: String(rates.usdToRubleSelling),
    });
  }, [loading, rates]);

  function validateBulk(): boolean {
    const newErrors: Partial<Record<keyof ExchangeRates, string>> = {};
    RATE_FIELDS.forEach(({ key }) => {
      const v = parseFloat(bulkForm[key]);
      if (!bulkForm[key] || Number.isNaN(v) || v <= 0) {
        newErrors[key] = 'Must be a positive number';
      }
    });
    setBulkErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleBulkSave() {
    if (!validateBulk()) return;
    setSavingBulk(true);
    setBulkAlert(null);
    const newRates: ExchangeRates = {
      rubleToUsdBuying: parseFloat(bulkForm.rubleToUsdBuying),
      usdToKwachaSelling: parseFloat(bulkForm.usdToKwachaSelling),
      kwachaToUsdBuying: parseFloat(bulkForm.kwachaToUsdBuying),
      usdToRubleSelling: parseFloat(bulkForm.usdToRubleSelling),
      updatedAt: new Date().toISOString(),
    };
    const ok = await saveRates(newRates);
    setBulkAlert(
      ok
        ? { type: 'success', message: 'Exchange rates saved.' }
        : {
            type: 'error',
            message: !accessToken
              ? 'Sign in as admin to save.'
              : !user?.isAdmin
                ? 'Admin rights required.'
                : 'Failed to save rates.',
          },
    );
    if (ok) void queryClient.invalidateQueries({ queryKey: ['admin', 'rateQuotes'] });
    setSavingBulk(false);
  }

  function openEdit(q: AdminRateQuote) {
    setEditQuote(q);
    setEditRate(String(q.rate));
  }

  const quoteRows = quotesQuery.data?.results ?? [];
  const quoteTotalPages = quotesQuery.data
    ? Math.max(1, Math.ceil(quotesQuery.data.count / ADMIN_PAGE_SIZE))
    : 1;

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading rates…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Rates</h2>
        <p className="text-sm text-muted-foreground">
          Bulk-update the four corridor rates and manage individual quote rows.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {bulkAlert ? (
            <Alert type={bulkAlert.type} message={bulkAlert.message} onClose={() => setBulkAlert(null)} />
          ) : null}

          <Card>
            <CardHeader
              title="Corridor rates (bulk)"
              subtitle={
                rates.updatedAt ? `Last updated ${new Date(rates.updatedAt).toLocaleString()}` : 'Not configured'
              }
            />
            <CardContent className="space-y-5">
              {RATE_FIELDS.map(({ key, label, hint, example }) => (
                <Input
                  key={key}
                  label={label}
                  type="number"
                  step="0.0001"
                  min="0"
                  placeholder={example}
                  value={bulkForm[key] ?? ''}
                  onChange={e => {
                    setBulkForm(f => ({ ...f, [key]: e.target.value }));
                    if (bulkErrors[key]) setBulkErrors(er => ({ ...er, [key]: undefined }));
                  }}
                  hint={hint}
                  error={bulkErrors[key]}
                  mono
                />
              ))}
            </CardContent>
            <CardDivider />
            <CardContent>
              <Button className="w-full" size="lg" onClick={() => void handleBulkSave()} loading={savingBulk}>
                Save corridor rates
              </Button>
            </CardContent>
          </Card>

          <LogicCard />
        </div>

        <Card>
          <CardHeader
            title="Rate quotes"
            subtitle="Slug-based rows; corridor slugs may soft-disable instead of hard delete"
          />
          <CardContent className="space-y-4">
            <Button type="button" onClick={() => setAddOpen(true)} disabled={!accessToken}>
              Add quote
            </Button>

            {!accessToken ? (
              <p className="text-sm text-muted-foreground">Sign in to manage quotes.</p>
            ) : quotesQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : quotesQuery.isError ? (
              <p className="text-sm text-destructive">{(quotesQuery.error as Error).message}</p>
            ) : quoteRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quotes on this page.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quoteRows.map(q => {
                    const { from, to } = rateSlugDisplay(q.slug);
                    return (
                      <TableRow key={q.id}>
                        <TableCell>{from}</TableCell>
                        <TableCell>{to}</TableCell>
                        <TableCell className="font-mono text-xs">{q.slug}</TableCell>
                        <TableCell className="font-mono">{q.rate}</TableCell>
                        <TableCell>{q.isActive ? 'Yes' : 'No'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => openEdit(q)}>
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                if (window.confirm(`Remove quote ${q.slug}?`)) deleteMutation.mutate(q.id);
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {quotesQuery.data != null && quoteTotalPages > 1 ? (
              <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  Page {quotePage} of {quoteTotalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={quotePage <= 1 || quotesQuery.isFetching}
                    onClick={() => setQuotePage(p => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={quotePage >= quoteTotalPages || quotesQuery.isFetching}
                    onClick={() => setQuotePage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New rate quote</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-slug">Slug</Label>
              <Input
                id="new-slug"
                value={newSlug}
                onChange={e => setNewSlug(e.target.value)}
                placeholder="e.g. custom_pair_buy"
                mono
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-rate">Rate</Label>
              <Input
                id="new-rate"
                type="number"
                step="any"
                min="0"
                value={newRate}
                onChange={e => setNewRate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editQuote} onOpenChange={open => !open && setEditQuote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit quote</DialogTitle>
          </DialogHeader>
          {editQuote ? (
            <div className="space-y-3 text-sm">
              <p className="font-mono text-muted-foreground">{editQuote.slug}</p>
              <div className="space-y-2">
                <Label htmlFor="edit-rate">Rate</Label>
                <Input id="edit-rate" type="number" step="any" min="0" value={editRate} onChange={e => setEditRate(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editQuote.isActive}
                  onChange={e => {
                    const checked = e.target.checked;
                    setEditQuote(q => (q ? { ...q, isActive: checked } : q));
                  }}
                />
                Active
              </label>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              onClick={() => {
                if (!editQuote) return;
                const rate = parseFloat(editRate);
                if (Number.isNaN(rate) || rate <= 0) {
                  toast.error('Rate must be positive');
                  return;
                }
                patchQuoteMutation.mutate(
                  { id: editQuote.id, rate, is_active: editQuote.isActive },
                  {
                    onSuccess: () => {
                      toast.success('Quote updated');
                      setEditQuote(null);
                    },
                  },
                );
              }}
              disabled={patchQuoteMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
