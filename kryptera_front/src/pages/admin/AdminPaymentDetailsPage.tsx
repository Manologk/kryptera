import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { adminKeys } from '@/features/admin/queryKeys';
import { getPaymentMethodTitle } from '@/constants/transferPlaceholders';
import {
  getAdminPaymentReceiving,
  patchAdminPaymentReceiving,
  type PaymentDisplayMode,
  type PaymentReceivingConfig,
  type PaymentReceivingDetails,
} from '@/services/api';
import { Button } from '@/components/ui/button';
import Card, { CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const CORRIDOR_LABELS: Record<string, string> = {
  'russia-zambia': 'Russia → Zambia',
  'zambia-russia': 'Zambia → Russia',
};

type ConfigFormState = {
  displayMode: PaymentDisplayMode;
  details: PaymentReceivingDetails;
};

function configToForm(config: PaymentReceivingConfig): ConfigFormState {
  return {
    displayMode: config.displayMode,
    details: { ...config.details, instructions: [...(config.details.instructions ?? [])] },
  };
}

function PaymentConfigCard({ config }: { config: PaymentReceivingConfig }) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ConfigFormState>(() => configToForm(config));

  useEffect(() => {
    setForm(configToForm(config));
  }, [config]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error('Not signed in');
      const res = await patchAdminPaymentReceiving(accessToken, config.id, {
        displayMode: form.displayMode,
        details: {
          ...form.details,
          instructions: (form.details.instructions ?? []).filter(Boolean),
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error('Empty response');
      return res.data;
    },
    onSuccess: () => {
      toast.success(`${getPaymentMethodTitle(config.paymentMethod)} settings saved`);
      void queryClient.invalidateQueries({ queryKey: adminKeys.paymentReceiving });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const instructionsText = (form.details.instructions ?? []).join('\n');

  const setDetail = (key: keyof PaymentReceivingDetails, value: string) => {
    setForm(prev => ({
      ...prev,
      details: { ...prev.details, [key]: value },
    }));
  };

  return (
    <Card subtle>
      <CardHeader
        title={getPaymentMethodTitle(config.paymentMethod)}
        subtitle={`Last updated ${config.updatedAt ? new Date(config.updatedAt).toLocaleString() : '—'}`}
      />
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>How users get payment details</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={`mode-${config.id}`}
                checked={form.displayMode === 'whatsapp'}
                onChange={() => setForm(prev => ({ ...prev, displayMode: 'whatsapp' }))}
              />
              Request via WhatsApp
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={`mode-${config.id}`}
                checked={form.displayMode === 'inline'}
                onChange={() => setForm(prev => ({ ...prev, displayMode: 'inline' }))}
              />
              Show on site
            </label>
          </div>
        </div>

        {form.displayMode === 'inline' ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            {config.paymentMethod === 'pay_bank_ru' ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor={`phone-${config.id}`}>Phone</Label>
                  <Input
                    id={`phone-${config.id}`}
                    value={form.details.phone ?? ''}
                    onChange={e => setDetail('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`account-${config.id}`}>Recipient name</Label>
                  <Input
                    id={`account-${config.id}`}
                    value={form.details.account_name ?? ''}
                    onChange={e => setDetail('account_name', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`bank-${config.id}`}>Bank name</Label>
                  <Input
                    id={`bank-${config.id}`}
                    value={form.details.bank_name ?? ''}
                    onChange={e => setDetail('bank_name', e.target.value)}
                  />
                </div>
              </>
            ) : null}

            {config.paymentMethod === 'pay_crypto_usdt' ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor={`network-${config.id}`}>Network</Label>
                  <Input
                    id={`network-${config.id}`}
                    value={form.details.network ?? ''}
                    onChange={e => setDetail('network', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`address-${config.id}`}>Wallet address</Label>
                  <Input
                    id={`address-${config.id}`}
                    value={form.details.address ?? ''}
                    onChange={e => setDetail('address', e.target.value)}
                  />
                </div>
              </>
            ) : null}

            {config.paymentMethod === 'pay_mobile_money' ? (
              <div className="space-y-1">
                <Label htmlFor={`mm-${config.id}`}>Mobile money number</Label>
                <Input
                  id={`mm-${config.id}`}
                  value={form.details.display_number ?? ''}
                  onChange={e => setDetail('display_number', e.target.value)}
                />
              </div>
            ) : null}

            <div className="space-y-1">
              <Label htmlFor={`instr-${config.id}`}>Instructions (one per line)</Label>
              <textarea
                id={`instr-${config.id}`}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={instructionsText}
                onChange={e =>
                  setForm(prev => ({
                    ...prev,
                    details: {
                      ...prev.details,
                      instructions: e.target.value.split('\n'),
                    },
                  }))
                }
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Users will see a WhatsApp link to request payment details. You can still store details below
            for when you switch back to on-site display.
          </p>
        )}

        {form.displayMode === 'whatsapp' ? (
          <div className="space-y-3 rounded-lg border border-dashed border-border p-4 opacity-90">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Stored details (optional)
            </p>
            {config.paymentMethod === 'pay_bank_ru' ? (
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="Phone"
                  value={form.details.phone ?? ''}
                  onChange={e => setDetail('phone', e.target.value)}
                />
                <Input
                  placeholder="Recipient name"
                  value={form.details.account_name ?? ''}
                  onChange={e => setDetail('account_name', e.target.value)}
                />
                <Input
                  placeholder="Bank"
                  value={form.details.bank_name ?? ''}
                  onChange={e => setDetail('bank_name', e.target.value)}
                />
              </div>
            ) : null}
            {config.paymentMethod === 'pay_crypto_usdt' ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Network"
                  value={form.details.network ?? ''}
                  onChange={e => setDetail('network', e.target.value)}
                />
                <Input
                  placeholder="Wallet address"
                  value={form.details.address ?? ''}
                  onChange={e => setDetail('address', e.target.value)}
                />
              </div>
            ) : null}
            {config.paymentMethod === 'pay_mobile_money' ? (
              <Input
                placeholder="Mobile money number"
                value={form.details.display_number ?? ''}
                onChange={e => setDetail('display_number', e.target.value)}
              />
            ) : null}
          </div>
        ) : null}

        <Button
          type="button"
          fullWidth={false}
          className="w-auto px-6"
          loading={mutation.isPending}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminPaymentDetailsPage() {
  const { accessToken } = useAuth();

  const query = useQuery({
    queryKey: adminKeys.paymentReceiving,
    enabled: Boolean(accessToken),
    queryFn: async () => {
      const res = await getAdminPaymentReceiving(accessToken!);
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error('No data');
      return res.data;
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, PaymentReceivingConfig[]>();
    for (const row of query.data ?? []) {
      const list = map.get(row.corridor) ?? [];
      list.push(row);
      map.set(row.corridor, list);
    }
    return map;
  }, [query.data]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payment details</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose whether each payment method shows account details on the site or sends users to WhatsApp.
        </p>
      </div>

      {query.isError ? (
        <Alert type="error" message={query.error instanceof Error ? query.error.message : 'Failed to load'} />
      ) : null}

      {query.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : null}

      {Array.from(grouped.entries()).map(([corridor, configs]) => (
        <section key={corridor} className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            {CORRIDOR_LABELS[corridor] ?? corridor}
          </h2>
          <div className="grid gap-4">
            {configs.map(c => (
              <PaymentConfigCard key={c.id} config={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
