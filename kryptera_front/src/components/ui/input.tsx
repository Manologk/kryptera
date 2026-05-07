import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export interface InputProps extends React.ComponentProps<'input'> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: string;
  mono?: boolean;
  /** Applied to the outer wrapper (label + field). `className` styles the native input. */
  wrapperClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, wrapperClassName, type, label, hint, error, prefix, mono, id, ...props }, ref) => {
    const inputId = id ?? React.useId();
    return (
      <div className={cn('w-full space-y-2', wrapperClassName)}>
        {label ? (
          <Label htmlFor={inputId} className="text-foreground">
            {label}
          </Label>
        ) : null}
        <div className="relative flex w-full items-center gap-2">
          {prefix ? (
            <span className="text-sm font-medium text-muted-foreground tabular-nums">{prefix}</span>
          ) : null}
          <input
            type={type}
            id={inputId}
            className={cn(
              'flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
              mono && 'font-mono',
              error && 'border-destructive focus-visible:ring-destructive',
              prefix && 'flex-1',
              !prefix && 'w-full',
              className,
            )}
            ref={ref}
            aria-invalid={error ? true : undefined}
            {...props}
          />
        </div>
        {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
export default Input;
