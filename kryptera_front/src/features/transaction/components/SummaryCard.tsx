import Card, { CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { formatMoneyAmount } from '@/features/transaction/utils';
import type { ConversionBreakdown, ConversionMode } from '@/types';

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
  onSend: () => void;
  sendDisabled?: boolean;
}

export default function SummaryCard({ mode, result, onSend, sendDisabled }: SummaryCardProps) {
  const isRZ = mode === 'russia-zambia';
  const onTop = result.commissionOnTop;
  const commissionPct = `${(result.commissionRate * 100).toFixed(2)}%`;

  return (
    <Card style={{ animation: 'fadeUp 0.25s ease' }}>
      <CardContent>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            paddingTop: 10,
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
              label={`Commission (${commissionPct}, on top)`}
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
              label={`Commission (${commissionPct})`}
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

        <Button fullWidth size="lg" variant="primary" className="mt-5" onClick={onSend} disabled={sendDisabled}>
          Send
        </Button>
      </CardContent>
    </Card>
  );
}
