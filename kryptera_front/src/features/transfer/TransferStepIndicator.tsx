import { Fragment } from 'react'
import { cn } from '@/lib/utils'

const LABELS = ['Recipient', 'Delivery', 'Payment', 'Proof'] as const

const STEPS = [1, 2, 3, 4] as const

export type TransferWizardStep = (typeof STEPS)[number]

export default function TransferStepIndicator({ currentStep }: { currentStep: TransferWizardStep }) {
  return (
    <nav className="mb-8 w-full" aria-label="Transfer steps">
      <div className="flex items-center gap-1 sm:gap-2">
        {STEPS.map((n, i) => (
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
            {i < STEPS.length - 1 ? (
              <div
                className={cn(
                  'h-[3px] min-w-[12px] flex-1 rounded-full transition-colors sm:min-w-[24px]',
                  currentStep > n ? 'bg-primary' : 'bg-border',
                )}
                aria-hidden
              />
            ) : null}
          </Fragment>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 text-center sm:gap-2">
        {LABELS.map((label, i) => {
          const stepNum = STEPS[i]
          return (
            <span
              key={label}
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wide sm:text-[11px]',
                currentStep === stepNum ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          )
        })}
      </div>
    </nav>
  )
}
