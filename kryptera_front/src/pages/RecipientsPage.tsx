import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createRecipient, deleteRecipient, getRecipients, updateRecipient } from '@/services/api';
import {
  buildDeliveryDetailsPayload,
  emptyDeliveryDetailFields,
  fieldsFromStoredDetails,
  type DeliveryDetailFields,
} from '@/features/recipient/deliveryDetails';
import { DELIVERY_OPTIONS, type DeliveryOptionId } from '@/constants/transferPlaceholders';
import type { Recipient } from '@/types';
import Card, { CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Layout, { PageHeader } from '@/components/layout/Layout';
import { Alert } from '@/components/ui/Badge';

export default function RecipientsPage() {
  const { accessToken, isAuthenticated } = useAuth();
  const [rows, setRows] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryOptionId | ''>('');
  const [detailFields, setDetailFields] = useState<DeliveryDetailFields>(emptyDeliveryDetailFields());
  const [editing, setEditing] = useState<Recipient | null>(null);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    const res = await getRecipients(accessToken);
    if (res.data) setRows(res.data);
    setLoading(false);
  }

  useEffect(() => {
    if (!accessToken) {
      setRows([]);
      setLoading(false);
      return;
    }
    void load();
  }, [accessToken]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !fullName.trim() || !deliveryMethod) return;
    setMsg(null);
    const details = buildDeliveryDetailsPayload(deliveryMethod, detailFields);
    const res = await createRecipient(accessToken, {
      full_name: fullName.trim(),
      email: email.trim() || undefined,
      phone_number: phoneNumber.trim() || undefined,
      delivery_method: deliveryMethod,
      delivery_details: details,
    });
    if (res.error) setMsg({ type: 'error', text: res.error.message });
    else {
      setMsg({ type: 'success', text: 'Recipient saved.' });
      setFullName('');
      setEmail('');
      setPhoneNumber('');
      setDeliveryMethod('');
      setDetailFields(emptyDeliveryDetailFields());
      await load();
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !editing || !deliveryMethod) return;
    setMsg(null);
    const details = buildDeliveryDetailsPayload(deliveryMethod, detailFields);
    const res = await updateRecipient(accessToken, editing.id, {
      full_name: fullName.trim(),
      email: email.trim() || undefined,
      phone_number: phoneNumber.trim() || undefined,
      delivery_method: deliveryMethod,
      delivery_details: details,
    });
    if (res.error) setMsg({ type: 'error', text: res.error.message });
    else {
      setMsg({ type: 'success', text: 'Recipient updated.' });
      setEditing(null);
      setFullName('');
      setEmail('');
      setPhoneNumber('');
      setDeliveryMethod('');
      setDetailFields(emptyDeliveryDetailFields());
      await load();
    }
  }

  async function handleDelete(id: number) {
    if (!accessToken) return;
    if (!window.confirm('Remove this recipient?')) return;
    setMsg(null);
    const res = await deleteRecipient(accessToken, id);
    if (res.error) setMsg({ type: 'error', text: res.error.message });
    else {
      setMsg({ type: 'success', text: 'Recipient removed.' });
      await load();
    }
  }

  function startEdit(r: Recipient) {
    setEditing(r);
    setFullName(r.fullName);
    setEmail(r.email ?? '');
    setPhoneNumber(r.phoneNumber ?? '');
    const dm = (r.deliveryMethod ?? '') as DeliveryOptionId | '';
    setDeliveryMethod(dm && DELIVERY_OPTIONS.some(o => o.id === dm) ? dm : '');
    setDetailFields(fieldsFromStoredDetails(r.deliveryMethod, r.deliveryDetails));
    setMsg(null);
  }

  function resetForm() {
    setEditing(null);
    setFullName('');
    setEmail('');
    setPhoneNumber('');
    setDeliveryMethod('');
    setDetailFields(emptyDeliveryDetailFields());
  }

  if (!isAuthenticated) {
    return (
      <Layout maxWidth={560}>
        <PageHeader title="Recipients" subtitle="Saved payout contacts" />
        <p style={{ color: 'var(--color-text-muted)' }}>Sign in to manage recipients.</p>
      </Layout>
    );
  }

  return (
    <Layout maxWidth={640}>
      <PageHeader title="Recipients" subtitle="Reuse details when you record a transfer" />

      {msg && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            type={msg.type === 'success' ? 'success' : 'error'}
            message={msg.text}
            onClose={() => setMsg(null)}
          />
        </div>
      )}

      <Card style={{ marginBottom: 20 }}>
        <CardHeader title={editing ? 'Edit recipient' : 'Add recipient'} />
        <form onSubmit={editing ? handleUpdate : handleCreate}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} required />
            <Input label="Email (optional)" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Phone number (optional)" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
            <div>
              <label
                htmlFor="rcp-delivery"
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--color-text-muted)',
                  marginBottom: 8,
                }}
              >
                Delivery method
              </label>
              <select
                id="rcp-delivery"
                value={deliveryMethod}
                onChange={e => {
                  const v = e.target.value as DeliveryOptionId | '';
                  setDeliveryMethod(v);
                  setDetailFields(emptyDeliveryDetailFields());
                }}
                required
                style={{
                  width: '100%',
                  fontSize: 14,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                }}
              >
                <option value="">Select…</option>
                {DELIVERY_OPTIONS.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </div>
            {deliveryMethod === 'mobile_money' ? (
              <Input
                label="Mobile money number"
                value={detailFields.wallet}
                onChange={e => setDetailFields(prev => ({ ...prev, wallet: e.target.value }))}
              />
            ) : null}
            {deliveryMethod === 'bank_deposit' ? (
              <>
                <Input
                  label="Bank name"
                  value={detailFields.bankName}
                  onChange={e => setDetailFields(prev => ({ ...prev, bankName: e.target.value }))}
                />
                <Input
                  label="Account number"
                  value={detailFields.accountNumber}
                  onChange={e => setDetailFields(prev => ({ ...prev, accountNumber: e.target.value }))}
                />
              </>
            ) : null}
            {deliveryMethod === 'cash_pickup' ? (
              <Input
                label="Pickup / location notes"
                value={detailFields.cashNotes}
                onChange={e => setDetailFields(prev => ({ ...prev, cashNotes: e.target.value }))}
              />
            ) : null}
          </div>
          <div className="mt-[18px] flex flex-wrap gap-3">
            <Button type="submit" fullWidth={false} className="min-w-[160px] flex-1">
              {editing ? 'Save changes' : 'Add recipient'}
            </Button>
            {editing ? (
              <Button type="button" variant="secondary" fullWidth={false} className="min-w-[120px] flex-1" onClick={resetForm}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Your recipients" />
        {loading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No recipients yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {rows.map((r, i) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  gap: 12,
                  padding: '16px 0',
                  borderBottom: i < rows.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <div>
                  <p style={{ fontWeight: 700, margin: 0 }}>{r.fullName}</p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
                    {DELIVERY_OPTIONS.find(o => o.id === r.deliveryMethod)?.title ?? r.deliveryMethod ?? '—'}
                    {r.phoneNumber ? ` · ${r.phoneNumber}` : ''}
                    {r.email ? ` · ${r.email}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="secondary" fullWidth={false} className="w-auto px-4" onClick={() => startEdit(r)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    fullWidth={false}
                    className="w-auto px-4"
                    onClick={() => void handleDelete(r.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Layout>
  );
}
