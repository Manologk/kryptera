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

/** Pill + dot for transaction tables / detail (non-border per design). */
const statusPill: Record<TransactionStatus, { wrap: string; dot: string }> = {
  completed: { wrap: 'bg-[#E8F5E9] text-[#2E7D32]', dot: 'bg-[#2E7D32]' },
  awaiting_confirmation: { wrap: 'bg-[#FFF8E1] text-[#F59E0B]', dot: 'bg-[#F59E0B]' },
  pending: { wrap: 'bg-[#F1EFE8] text-[#888]', dot: 'bg-[#CACACA]' },
  pop_not_uploaded: { wrap: 'bg-[#F1EFE8] text-[#888]', dot: 'bg-[#CACACA]' },
  pending_verification: { wrap: 'bg-[#FFF8E1] text-[#F59E0B]', dot: 'bg-[#F59E0B]' },
  rejected: { wrap: 'bg-[#FDE8E8] text-[#E24B4A]', dot: 'bg-[#E24B4A]' },
  canceled: { wrap: 'bg-[#ECEFF1] text-[#546E7A]', dot: 'bg-[#90A4AE]' },
};

const statusLabel: Record<TransactionStatus, string> = {
  pending: 'Pending',
  awaiting_confirmation: 'Awaiting confirmation',
  pop_not_uploaded: 'Awaiting POP',
  pending_verification: 'Pending verification',
  completed: 'Completed',
  rejected: 'Declined',
  canceled: 'Canceled',
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const { wrap, dot } = statusPill[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[20px] border-0 py-1 pl-[10px] pr-[10px] text-[12px] font-medium',
        wrap,
      )}
    >
      <span className={cn('mr-[5px] inline-block h-[6px] w-[6px] shrink-0 rounded-full', dot)} aria-hidden />
      {statusLabel[status]}
    </span>
  );
}

export { Badge, badgeVariants };
