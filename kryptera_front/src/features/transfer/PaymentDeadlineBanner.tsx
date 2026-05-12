import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type PaymentDeadlineBannerProps = {
  deadlineIso: string
  /** Called once when the countdown reaches zero (client clock). */
  onExpired?: () => void
  className?: string
}

const formatRemaining = (totalSeconds: number): string => {
  const s = Math.max(0, totalSeconds)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export const PaymentDeadlineBanner = ({ deadlineIso, onExpired, className }: PaymentDeadlineBannerProps) => {
  const [, setTick] = useState(0)
  const expiredRef = useRef(false)

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [deadlineIso])

  const endMs = Date.parse(deadlineIso)
  const remainingSec = Number.isFinite(endMs) ? Math.max(0, Math.floor((endMs - Date.now()) / 1000)) : 0

  useEffect(() => {
    if (remainingSec > 0) return
    if (expiredRef.current) return
    expiredRef.current = true
    onExpired?.()
  }, [remainingSec, onExpired])

  const urgent = remainingSec > 0 && remainingSec <= 120

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Time remaining to upload proof of payment: ${formatRemaining(remainingSec)}`}
      className={cn(
        'rounded-lg border px-4 py-3 text-sm font-medium',
        remainingSec === 0
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : urgent
            ? 'border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100'
            : 'border-border bg-muted/50 text-foreground',
        className,
      )}
    >
      {remainingSec === 0 ? (
        <p className="m-0">Time is up — confirming status with the server…</p>
      ) : (
        <p className="m-0">
          Upload proof of payment within{' '}
          <span className="font-mono text-base font-bold tabular-nums">{formatRemaining(remainingSec)}</span>
        </p>
      )}
    </div>
  )
}
