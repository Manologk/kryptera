import { Link } from 'react-router-dom';
import { COMMISSION_RATE } from '@/constants';
import { ROUTES } from '@/constants/routes';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Alert } from '@/components/ui/Badge';
import { formatMoneyAmount } from '@/features/transaction/utils';
import type { ConversionBreakdown, ConversionMode, Recipient } from '@/types';

interface BreakdownRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
  /** Show as an added amount (commission on top) instead of a deduction */
  additive?: boolean;
}

function BreakdownRow({ label, value, highlight, negative, additive }: BreakdownRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '13px 0',
        borderBottom: highlight ? 'none' : '1px solid var(--color-border)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{label}</span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: highlight ? '1.2rem' : '0.9375rem',
          fontWeight: highlight ? 700 : 500,
          color: highlight
            ? 'var(--color-primary-dark)'
            : negative
              ? 'var(--color-error)'
              : 'var(--color-text)',
        }}
      >
        {additive ? `+ ${value}` : value}
      </span>
    </div>
  );
}

export interface SummaryCardProps {
  mode: ConversionMode;
  result: ConversionBreakdown;
  recordMsg: { type: 'success' | 'error'; text: string } | null;
  onDismissRecordMsg: () => void;
  onRecord: () => void;
  recipients?: Recipient[];
  recipientId: number | null;
  onRecipientIdChange: (id: number | null) => void;
}

export default function SummaryCard({
  mode,
  result,
  recordMsg,
  onDismissRecordMsg,
  onRecord,
  recipients = [],
  recipientId,
  onRecipientIdChange,
}: SummaryCardProps) {
  const isRZ = mode === 'russia-zambia';
  const onTop = result.commissionOnTop;

  return (
    <Card style={{ animation: 'fadeUp 0.25s ease' }}>
      {recordMsg && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            type={recordMsg.type === 'success' ? 'success' : 'error'}
            message={recordMsg.text}
            onClose={onDismissRecordMsg}
          />
          {recordMsg.type === 'success' && (
            <p style={{ marginTop: 10, marginBottom: 0, fontSize: 14 }}>
              <Link to={ROUTES.activity} style={{ color: '#166534', fontWeight: 600 }}>
                View activity →
              </Link>
            </p>
          )}
        </div>
      )}

      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          marginBottom: 4,
        }}
      >
        Conversion breakdown
      </p>

      {onTop ? (
        <>
          <BreakdownRow
            label="Amount to convert"
            value={formatMoneyAmount(result.input, result.inputCurrency)}
          />
          <BreakdownRow
            label={`Commission (${(COMMISSION_RATE * 100).toFixed(1)}%, on top)`}
            value={formatMoneyAmount(result.commission, result.inputCurrency)}
            additive
          />
          <BreakdownRow
            label="Total you pay"
            value={formatMoneyAmount(result.totalDebited, result.inputCurrency)}
          />
        </>
      ) : (
        <>
          <BreakdownRow label="You send" value={formatMoneyAmount(result.totalDebited, result.inputCurrency)} />
          <BreakdownRow
            label={`Commission (${(COMMISSION_RATE * 100).toFixed(1)}%)`}
            value={`− ${formatMoneyAmount(result.commission, result.inputCurrency)}`}
            negative
          />
          <BreakdownRow
            label="After commission"
            value={formatMoneyAmount(result.afterCommission, result.inputCurrency)}
          />
        </>
      )}
      <BreakdownRow label="Converted to USD" value={formatMoneyAmount(result.usd, 'USD')} />

      <div
        style={{
          marginTop: 8,
          paddingTop: 16,
          borderTop: '2px solid var(--color-primary)',
        }}
      >
        <BreakdownRow
          label={isRZ ? 'Recipient gets' : 'You receive'}
          value={formatMoneyAmount(result.final, result.outputCurrency)}
          highlight
        />
      </div>

      {recipients.length > 0 ? (
        <div style={{ marginTop: 20 }}>
          <label
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-text-muted)',
              display: 'block',
              marginBottom: 8,
            }}
          >
            Link recipient (optional)
          </label>
          <select
            value={recipientId ?? ''}
            onChange={e => {
              const v = e.target.value;
              onRecipientIdChange(v === '' ? null : Number(v));
            }}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              background: 'var(--color-surface)',
            }}
          >
            <option value="">None</option>
            {recipients.filter(r => r.isActive).map(r => (
              <option key={r.id} value={r.id}>
                {r.label ? `${r.label} — ${r.fullName}` : r.fullName}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <Button fullWidth size="lg" variant="primary" style={{ marginTop: 20 }} onClick={onRecord}>
        Record transfer
      </Button>
    </Card>
  );
}
