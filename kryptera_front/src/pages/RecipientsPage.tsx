import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createRecipient, deleteRecipient, getRecipients, updateRecipient } from '@/services/api';
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
  const [label, setLabel] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
    if (!accessToken || !fullName.trim()) return;
    setMsg(null);
    const res = await createRecipient(accessToken, {
      full_name: fullName.trim(),
      label: label.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    if (res.error) setMsg({ type: 'error', text: res.error.message });
    else {
      setMsg({ type: 'success', text: 'Recipient saved.' });
      setLabel('');
      setFullName('');
      setEmail('');
      setPhone('');
      await load();
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !editing) return;
    setMsg(null);
    const res = await updateRecipient(accessToken, editing.id, {
      full_name: fullName.trim(),
      label: label.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
    });
    if (res.error) setMsg({ type: 'error', text: res.error.message });
    else {
      setMsg({ type: 'success', text: 'Recipient updated.' });
      setEditing(null);
      setLabel('');
      setFullName('');
      setEmail('');
      setPhone('');
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
    setLabel(r.label);
    setFullName(r.fullName);
    setEmail(r.email ?? '');
    setPhone(r.phone ?? '');
    setMsg(null);
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
            <Input label="Nickname (optional)" value={label} onChange={e => setLabel(e.target.value)} />
            <Input label="Full name" value={fullName} onChange={e => setFullName(e.target.value)} required />
            <Input label="Email (optional)" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <Button type="submit">{editing ? 'Save changes' : 'Add recipient'}</Button>
            {editing ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditing(null);
                  setLabel('');
                  setFullName('');
                  setEmail('');
                  setPhone('');
                }}
              >
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
                  <p style={{ fontWeight: 700, margin: 0 }}>{r.label || r.fullName}</p>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
                    {r.fullName}
                    {r.email ? ` · ${r.email}` : ''}
                    {r.phone ? ` · ${r.phone}` : ''}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Button type="button" size="sm" variant="secondary" onClick={() => startEdit(r)}>
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant="danger" onClick={() => void handleDelete(r.id)}>
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
