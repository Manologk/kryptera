import { Fragment } from 'react';
import { cn } from '@/lib/utils';

const LABELS = ['Recipient', 'Delivery', 'Payment'] as const;

export default function TransferStepIndicator({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <nav className="mb-8 w-full" aria-label="Transfer steps">
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((n, i) => (
          <Fragment key={n}>
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                currentStep > n && 'border-primary bg-primary text-primary-foreground',
                currentStep === n && 'border-primary bg-primary/15 text-foreground ring-2 ring-primary/35',
                currentStep < n && 'border-muted-foreground/35 bg-card text-muted-foreground',
              )}
              aria-current={currentStep === n ? 'step' : undefined}
            >
              {currentStep > n ? '✓' : n}
            </div>
            {i < 2 ? (
              <div
                className={cn('h-[3px] min-w-[24px] flex-1 rounded-full transition-colors', currentStep > n ? 'bg-primary' : 'bg-border')}
                aria-hidden
              />
            ) : null}
          </Fragment>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {LABELS.map((label, i) => {
          const step = (i + 1) as 1 | 2 | 3;
          return (
            <span
              key={label}
              className={cn(
                'text-[11px] font-semibold uppercase tracking-wide',
                currentStep === step ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
