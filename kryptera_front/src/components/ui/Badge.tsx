import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransactionStatus } from '@/types';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export interface AlertProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose?: () => void;
}

export function Alert({ type, message, onClose }: AlertProps) {
  const styles =
    type === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : type === 'error'
        ? 'border-destructive/30 bg-destructive/10 text-destructive'
        : 'border-border bg-muted text-foreground';

  return (
    <div
      className={cn(
        'relative flex items-start gap-2 rounded-lg border px-4 py-3 text-sm',
        styles,
      )}
      role="alert"
    >
      <p className="flex-1 pr-6">{message}</p>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded p-1 opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

const statusStyles: Record<TransactionStatus, string> = {
  pop_not_uploaded: 'bg-amber-100 text-amber-900 border-amber-200',
  pending_verification: 'bg-sky-100 text-sky-900 border-sky-200',
  completed: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  rejected: 'bg-red-100 text-red-900 border-red-200',
};

const statusLabel: Record<TransactionStatus, string> = {
  pop_not_uploaded: 'Awaiting POP',
  pending_verification: 'Pending',
  completed: 'Completed',
  rejected: 'Declined',
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
        statusStyles[status],
      )}
    >
      {statusLabel[status]}
    </span>
  );
}

export { Badge, badgeVariants };
