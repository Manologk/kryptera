import { useRates } from '@/context/RatesContext';
import Card, { CardContent } from '@/components/ui/card';
import Input from '@/components/ui/input';
import type { ConversionMode } from '@/types';

interface ModeToggleProps {
  value: ConversionMode;
  onChange: (m: ConversionMode) => void;
}

function ModeToggle({ value, onChange }: ModeToggleProps) {
  const modes: { id: ConversionMode; label: string; from: string; to: string }[] = [
    { id: 'russia-zambia', label: 'Russia → Zambia', from: '🇷🇺', to: '🇿🇲' },
    { id: 'zambia-russia', label: 'Zambia → Russia', from: '🇿🇲', to: '🇷🇺' },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 6,
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-lg)',
        padding: 6,
        border: '1px solid var(--color-border)',
        marginBottom: 20,
      }}
    >
      {modes.map(m => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          style={{
            padding: '11px 12px',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            transition: 'all 180ms ease',
            background: value === m.id ? 'var(--color-surface)' : 'transparent',
            color: value === m.id ? 'var(--color-text)' : 'var(--color-text-muted)',
            boxShadow: value === m.id ? 'var(--shadow-sm)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span>{m.from}</span>
          <span style={{ fontSize: 11, opacity: 0.6 }}>→</span>
          <span>{m.to}</span>
          <span style={{ marginLeft: 4 }}>{m.label.split('→')[1]?.trim()}</span>
        </button>
      ))}
    </div>
  );
}

function RateSummary({ mode }: { mode: ConversionMode }) {
  const { rates, loading } = useRates();
  if (loading) return null;

  const hasRates = rates.rubleToUsdBuying > 0;
  if (!hasRates) {
    return (
      <p style={{ fontSize: 13, color: 'var(--color-error)', marginBottom: 16 }}>
        No exchange rates set. Configure them in Admin to continue.
      </p>
    );
  }

  const buyRate = mode === 'russia-zambia' ? rates.rubleToUsdBuying : rates.kwachaToUsdBuying;
  const sellRate = mode === 'russia-zambia' ? rates.usdToKwachaSelling : rates.usdToRubleSelling;
  const fromCcy = mode === 'russia-zambia' ? '₽' : 'ZMW';
  const toCcy = mode === 'russia-zambia' ? 'ZMW' : '₽';
  const cr =
    rates.commissionRate != null &&
    Number.isFinite(rates.commissionRate) &&
    rates.commissionRate > 0 &&
    rates.commissionRate < 1
      ? rates.commissionRate
      : 0.045;
  const commissionPct = `${(cr * 100).toFixed(2)}%`;

  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}
    >
      {[
        { label: 'Buy rate', value: `$1 = ${buyRate} ${fromCcy}` },
        { label: 'Sell rate', value: `$1 = ${sellRate} ${toCcy}` },
        { label: 'Commission', value: commissionPct },
      ].map(({ label, value }) => (
        <div
          key={label}
          style={{
            flex: '1 1 120px',
            background: 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            style={{
              fontSize: 11,
              color: 'var(--color-text-muted)',
              marginBottom: 2,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {label}
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{value}</p>
        </div>
      ))}
    </div>
  );
}

export interface TransferFormProps {
  mode: ConversionMode;
  sendAmount: string;
  receiveAmount: string;
  commissionOnTop: boolean;
  commissionOnTopDisabled?: boolean;
  onCommissionOnTopChange: (v: boolean) => void;
  onModeChange: (m: ConversionMode) => void;
  onSendAmountChange: (v: string) => void;
  onReceiveAmountChange: (v: string) => void;
}

export default function TransferForm({
  mode,
  sendAmount,
  receiveAmount,
  commissionOnTop,
  commissionOnTopDisabled = false,
  onCommissionOnTopChange,
  onModeChange,
  onSendAmountChange,
  onReceiveAmountChange,
}: TransferFormProps) {
  const isRZ = mode === 'russia-zambia'
  const sendPrefix = isRZ ? '₽' : 'K'
  const receivePrefix = isRZ ? 'K' : '₽'
  const receiveLabel = isRZ ? 'The recipient gets' : 'You receive'

  return (
    <>
      <ModeToggle value={mode} onChange={onModeChange} />
      <RateSummary mode={mode} />

      <Card style={{ marginBottom: 16 }}>
        <CardContent className='pt-5'>
          <Input
            label="You send"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={sendAmount}
            onChange={e => onSendAmountChange(e.target.value)}
            prefix={sendPrefix}
            mono
            hint={
              commissionOnTop
                ? 'This full amount is converted; commission is charged on top (see breakdown)'
                : 'Total amount debited from you (commission is taken from this)'
            }
          />

          <Input
            label={receiveLabel}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={receiveAmount}
            onChange={e => onReceiveAmountChange(e.target.value)}
            prefix={receivePrefix}
            mono
            wrapperClassName="mt-4"
            hint="Enter how much should arrive after conversion; we calculate what you need to send"
          />

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginTop: 16,
              cursor: commissionOnTopDisabled ? 'not-allowed' : 'pointer',
              fontSize: 14,
              color: commissionOnTopDisabled ? 'var(--color-text-muted)' : 'var(--color-text)',
              lineHeight: 1.45,
              opacity: commissionOnTopDisabled ? 0.65 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={commissionOnTop}
              disabled={commissionOnTopDisabled}
              onChange={e => onCommissionOnTopChange(e.target.checked)}
              style={{
                marginTop: 3,
                width: 18,
                height: 18,
                flexShrink: 0,
                cursor: commissionOnTopDisabled ? 'not-allowed' : 'pointer',
              }}
            />
            <span>
              <strong>Add commission on top</strong>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                {commissionOnTopDisabled
                  ? 'Not available when you enter the amount the recipient should receive. Edit “You send” to use this option.'
                  : 'When checked, the amount above is converted in full and the fee is charged separately. When unchecked, the fee is taken out of the amount you enter.'}
              </span>
            </span>
          </label>
        </CardContent>
      </Card>
    </>
  );
}
