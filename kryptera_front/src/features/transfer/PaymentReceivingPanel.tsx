import { Copy, MessageCircle } from 'lucide-react';
import { CONTACT_INFO } from '@/constants';
import type { PaymentReceivingConfig } from '@/services/api';
import type { ConversionMode } from '@/types';
import type { PaymentOptionId } from '@/constants/transferPlaceholders';
import { cn } from '@/lib/utils';
import { whatsappMethodLabel } from '@/features/transfer/paymentReceivingFallback';

const buildWhatsappPaymentUrl = (
  amount: number | undefined,
  currency: string,
  methodLabel: string,
): string => {
  const amountPart =
    amount != null && Number.isFinite(amount)
      ? ` for ${amount.toLocaleString()} ${currency} `
      : ' ';
  const message =
    `Hi, I have a transfer${amountPart}` +
    `and I'd like to request the ${methodLabel} payment details to complete my payment.`;
  return `https://wa.me/${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(message)}`;
};

export type PaymentReceivingPanelProps = {
  corridor: ConversionMode;
  paymentMethod: PaymentOptionId;
  config: PaymentReceivingConfig;
  amount?: number;
  inputCurrency?: string;
  variant?: 'step' | 'summary';
  onCopyUsdtAddress?: () => void;
  className?: string;
};

export function PaymentReceivingPanel({
  corridor,
  paymentMethod,
  config,
  amount,
  inputCurrency = corridor === 'russia-zambia' ? 'RUB' : 'ZMW',
  variant = 'step',
  onCopyUsdtAddress,
  className,
}: PaymentReceivingPanelProps) {
  const details = config.details ?? {};
  const instructions = details.instructions ?? [];

  if (config.displayMode === 'whatsapp') {
    const href = buildWhatsappPaymentUrl(amount, inputCurrency, whatsappMethodLabel(paymentMethod));
    const inner = (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm no-underline transition-colors hover:bg-green-100',
          variant === 'summary' && 'mt-2 p-3',
        )}
      >
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden />
        <div>
          <p className="font-semibold text-green-900">Click here to request for payment details</p>
        </div>
      </a>
    );

    if (variant === 'summary') {
      return (
        <div className={cn('border-b border-border py-3 text-sm', className)}>
          <p className="font-medium text-muted-foreground">Where you send</p>
          {inner}
        </div>
      );
    }

    return <div className={cn('animate-fade-up', className)}>{inner}</div>;
  }

  const card = (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/30 p-4 text-sm',
        variant === 'summary' && 'mt-3',
      )}
    >
      {paymentMethod === 'pay_bank_ru' ? (
        <div className="space-y-3">
          <p className="font-semibold text-foreground">Pay by bank transfer</p>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</p>
            <p className="mt-0.5 font-mono font-semibold">{details.phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recipient name</p>
            <p className="mt-0.5 font-medium">{details.account_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bank</p>
            <p className="mt-0.5 font-medium">{details.bank_name ?? '—'}</p>
          </div>
        </div>
      ) : null}

      {paymentMethod === 'pay_mobile_money' ? (
        <div>
          <p className="font-semibold text-foreground">Pay with mobile money</p>
          <p className="mt-2 font-mono text-base font-semibold text-foreground">
            {details.display_number ?? '—'}
          </p>
        </div>
      ) : null}

      {paymentMethod === 'pay_crypto_usdt' ? (
        <div className="space-y-2.5">
          <p className="font-semibold text-foreground">Pay with USDT</p>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Network</p>
            <p className="mt-0.5 font-medium">{details.network ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Wallet address</p>
            <div className="mt-1 flex items-start gap-2">
              <p className="min-w-0 flex-1 break-all font-mono text-sm font-medium">
                {details.address ?? '—'}
              </p>
              {onCopyUsdtAddress ? (
                <button
                  type="button"
                  onClick={() => onCopyUsdtAddress()}
                  className="shrink-0 rounded-md border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Copy wallet address to clipboard"
                >
                  <Copy className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {instructions.length > 0 ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
          {instructions.map(line => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  if (variant === 'summary') {
    return (
      <div className={cn('border-b border-border py-3 text-sm', className)}>
        <p className="font-medium text-muted-foreground">Where you send</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Kryptera receiving account</p>
        {card}
      </div>
    );
  }

  return <div className={cn('animate-fade-up', className)}>{card}</div>;
}
