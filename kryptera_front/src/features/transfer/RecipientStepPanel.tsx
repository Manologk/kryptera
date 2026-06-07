import { useMemo } from 'react';
import { Banknote, Building2, Smartphone } from 'lucide-react';
import Card, { CardContent } from '@/components/ui/card';
import Input from '@/components/ui/input';
import { getDeliveryOptionsForCorridor, type DeliveryOptionId } from '@/constants/transferPlaceholders';
import ChoiceTile from './ChoiceTile';
import type { ConversionMode, Recipient } from '@/types';
import type { DeliveryDetailFields } from '@/features/recipient/deliveryDetails';

export type RecipientSourceTab = 'saved' | 'new';

const DELIVERY_ICONS: Record<DeliveryOptionId, React.ReactNode> = {
  bank_deposit: <Building2 className="h-5 w-5" aria-hidden />,
  mobile_money: <Smartphone className="h-5 w-5" aria-hidden />,
  cash_pickup: <Banknote className="h-5 w-5" aria-hidden />,
};

interface RecipientStepPanelProps {
  corridorMode: ConversionMode;
  sourceTab: RecipientSourceTab;
  onSourceTabChange: (tab: RecipientSourceTab) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  recipients: Recipient[];
  recipientsLoading: boolean;
  selectedRecipientId: number | null;
  onSelectRecipientId: (id: number) => void;
  newFullName: string;
  newEmail: string;
  newPhone: string;
  onNewFullNameChange: (v: string) => void;
  onNewEmailChange: (v: string) => void;
  onNewPhoneChange: (v: string) => void;
  newDeliveryMethod: DeliveryOptionId | null;
  onNewDeliveryMethodChange: (id: DeliveryOptionId) => void;
  deliveryDetailFields: DeliveryDetailFields;
  onDeliveryDetailFieldsChange: (patch: Partial<DeliveryDetailFields>) => void;
  saveForLater: boolean;
  onSaveForLaterChange: (v: boolean) => void;
  error: string | null;
}

export default function RecipientStepPanel({
  corridorMode,
  sourceTab,
  onSourceTabChange,
  searchQuery,
  onSearchQueryChange,
  recipients,
  recipientsLoading,
  selectedRecipientId,
  onSelectRecipientId,
  newFullName,
  newEmail,
  newPhone,
  onNewFullNameChange,
  onNewEmailChange,
  onNewPhoneChange,
  newDeliveryMethod,
  onNewDeliveryMethodChange,
  deliveryDetailFields,
  onDeliveryDetailFieldsChange,
  saveForLater,
  onSaveForLaterChange,
  error,
}: RecipientStepPanelProps) {
  const recipientDeliveryOptions = useMemo(() => getDeliveryOptionsForCorridor(corridorMode), [corridorMode])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter(r => {
      const blob = [r.fullName, r.email, r.phoneNumber, r.deliveryMethod]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [recipients, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-up">
      <p className="text-sm text-muted-foreground">
        Choose someone you’ve saved before, or add a new recipient with how they receive funds.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-lg)',
          padding: 6,
          border: '1px solid var(--color-border)',
        }}
      >
        <button
          type="button"
          onClick={() => onSourceTabChange('saved')}
          style={{
            padding: '11px 12px',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'background 0.15s',
            background: sourceTab === 'saved' ? 'var(--color-surface)' : 'transparent',
            boxShadow: sourceTab === 'saved' ? 'var(--shadow-sm)' : 'none',
            color: 'var(--color-text)',
          }}
        >
          Saved contacts
        </button>
        <button
          type="button"
          onClick={() => onSourceTabChange('new')}
          style={{
            padding: '11px 12px',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'background 0.15s',
            background: sourceTab === 'new' ? 'var(--color-surface)' : 'transparent',
            boxShadow: sourceTab === 'new' ? 'var(--shadow-sm)' : 'none',
            color: 'var(--color-text)',
          }}
        >
          Someone new
        </button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {sourceTab === 'saved' ? (
        <Card className="border-border shadow-sm">
          <CardContent className="space-y-4 pt-6">
            <Input
              label="Search recipients"
              placeholder="Name, email, phone, or delivery type"
              value={searchQuery}
              onChange={e => onSearchQueryChange(e.target.value)}
              autoComplete="off"
            />
            {recipientsLoading ? (
              <p className="text-sm text-muted-foreground">Loading your recipients…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {recipients.length === 0
                  ? 'No saved recipients yet. Switch to “Someone new” to continue.'
                  : 'No matches — try another search or add someone new.'}
              </p>
            ) : (
              <ul className="flex max-h-[min(52vh,380px)] flex-col gap-2 overflow-y-auto pr-1" role="listbox">
                {filtered.map(r => {
                  const selected = selectedRecipientId === r.id;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => onSelectRecipientId(r.id)}
                        className={
                          selected
                            ? 'w-full rounded-lg border-2 border-primary bg-primary/10 px-4 py-3 text-left shadow-sm ring-2 ring-primary/25 transition-colors'
                            : 'w-full rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40'
                        }
                      >
                        <p className="font-semibold text-foreground">{r.fullName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {r.phoneNumber ? `${r.phoneNumber}` : ''}
                          {r.phoneNumber && r.email ? ' · ' : ''}
                          {r.email ?? ''}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-sm">
          <CardContent className="space-y-4 pt-6">
            <Input label="Full name" value={newFullName} onChange={e => onNewFullNameChange(e.target.value)} />
            <Input
              label="Phone number (optional)"
              value={newPhone}
              onChange={e => onNewPhoneChange(e.target.value)}
              hint="For SMS or wallet routing where applicable."
            />
            <Input label="Email (optional)" type="email" value={newEmail} onChange={e => onNewEmailChange(e.target.value)} />

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                How they receive funds <span className="text-destructive" aria-hidden>*</span>
              </p>
              <div className="flex flex-col gap-3" role="radiogroup" aria-label="Recipient delivery method">
                {recipientDeliveryOptions.map(opt => (
                  <ChoiceTile
                    key={opt.id}
                    name={`recipient-delivery-${opt.id}`}
                    title={opt.title}
                    description={opt.description}
                    selected={newDeliveryMethod === opt.id}
                    onSelect={() => onNewDeliveryMethodChange(opt.id)}
                    icon={DELIVERY_ICONS[opt.id]}
                  />
                ))}
              </div>
            </div>

            {newDeliveryMethod === 'mobile_money' ? (
              <Input
                label="Mobile money number"
                value={deliveryDetailFields.wallet}
                onChange={e => onDeliveryDetailFieldsChange({ wallet: e.target.value })}
                required
                hint="Required. Used as the contact phone if you leave phone number blank."
              />
            ) : null}
            {newDeliveryMethod === 'bank_deposit' ? (
              <>
                <Input
                  label="Bank name"
                  value={deliveryDetailFields.bankName}
                  onChange={e => onDeliveryDetailFieldsChange({ bankName: e.target.value })}
                />
                <Input
                  label="Account number"
                  value={deliveryDetailFields.accountNumber}
                  onChange={e => onDeliveryDetailFieldsChange({ accountNumber: e.target.value })}
                />
              </>
            ) : null}
            {newDeliveryMethod === 'cash_pickup' ? (
              <Input
                label="Pickup / location notes"
                value={deliveryDetailFields.cashNotes}
                onChange={e => onDeliveryDetailFieldsChange({ cashNotes: e.target.value })}
              />
            ) : null}

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
                checked={saveForLater}
                onChange={e => onSaveForLaterChange(e.target.checked)}
              />
              <span className="text-sm leading-snug text-foreground">
                <span className="font-semibold">Save for future transfers</span>
                <span className="block text-muted-foreground">Store this contact under your account for next time.</span>
              </span>
            </label>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
