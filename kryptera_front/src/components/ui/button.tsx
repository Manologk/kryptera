import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ButtonVariantName =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'default'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'danger'

function normalizeVariant(variant: ButtonVariantName | undefined): 'primary' | 'secondary' | 'destructive' {
  switch (variant) {
    case 'outline':
    case 'ghost':
    case 'link':
    case 'secondary':
      return 'secondary'
    case 'destructive':
    case 'danger':
      return 'destructive'
    case 'primary':
    case 'default':
    case undefined:
    default:
      return 'primary'
  }
}

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm transition-[opacity,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#163300]/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'border-0 bg-[#163300] font-semibold text-[#9FE1CB] shadow-none hover:opacity-90',
        secondary:
          'border-[1.5px] border-solid border-[#163300] bg-transparent font-medium text-[#163300] shadow-none hover:bg-[#F7F7F5]',
        destructive:
          'border-[1.5px] border-solid border-[#E24B4A] bg-transparent font-medium text-[#E24B4A] shadow-none hover:bg-[#F7F7F5]',
      },
      size: {
        default:
          'min-h-[44px] h-11 w-full rounded-[10px] px-4 active:scale-[0.98] [&:active]:scale-[0.98]',
        lg: 'min-h-[44px] h-11 w-full rounded-[10px] px-4 active:scale-[0.98] [&:active]:scale-[0.98]',
        sm: 'min-h-[44px] h-11 w-full rounded-[10px] px-4 active:scale-[0.98] [&:active]:scale-[0.98]',
        icon:
          'h-9 w-9 min-h-0 shrink-0 rounded-[10px] border-[1.5px] border-solid border-[#163300] bg-transparent p-0 font-medium text-[#163300] hover:bg-[#F7F7F5] hover:opacity-100 active:scale-100',
      },
    },
    compoundVariants: [
      {
        variant: 'primary',
        size: 'icon',
        class:
          'border-0 bg-[#163300] text-[#9FE1CB] hover:opacity-90 active:scale-100 [&:active]:scale-100',
      },
      {
        variant: 'destructive',
        size: 'icon',
        class:
          'border-[1.5px] border-[#E24B4A] text-[#E24B4A] hover:bg-[#F7F7F5] active:scale-100 [&:active]:scale-100',
      },
    ],
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  /** When false, button is not forced to full width (footers, pagination). Default: full width for text sizes. */
  fullWidth?: boolean
  loading?: boolean
  variant?: ButtonVariantName
  size?: 'default' | 'lg' | 'sm' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      fullWidth,
      loading,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const nv = normalizeVariant(variant)
    const mergedClassName = cn(
      buttonVariants({ variant: nv, size, className }),
      fullWidth === false && '!w-auto',
    )
    const isBusy = Boolean(disabled || loading)

    if (asChild) {
      return (
        <Slot className={mergedClassName} ref={ref} {...props} disabled={isBusy} aria-busy={loading || undefined}>
          {children}
        </Slot>
      )
    }

    return (
      <button className={mergedClassName} ref={ref} disabled={isBusy} aria-busy={loading || undefined} {...props}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {children}
      </button>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
export default Button
